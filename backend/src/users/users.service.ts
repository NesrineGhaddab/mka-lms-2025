import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {
  // Stockage temporaire des utilisateurs quand la DB n'est pas disponible
  private fallbackUsers: any[] = [
    {
      id: 1,
      email: 'khalil@gmail.com',
      role: 'Admin',
      name: 'Khalil Admin',
      phone: null,
      profilePic: null,
      location: null,
      skills: [],
      about: null
    }
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private generateTempPassword(length = 10): string {
    // Utiliser des caractères plus lisibles pour éviter les confusions (pas de 0/O, 1/l/I, etc.)
    const upperChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowerChars = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const specialChars = '@#$%&*!?';

    // S'assurer que le mot de passe contient au moins un caractère de chaque catégorie
    let password = '';
    password += upperChars.charAt(Math.floor(Math.random() * upperChars.length));
    password += lowerChars.charAt(Math.floor(Math.random() * lowerChars.length));
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
    password += specialChars.charAt(Math.floor(Math.random() * specialChars.length));

    // Compléter le reste du mot de passe
    const allChars = upperChars + lowerChars + numbers + specialChars;
    const remainingLength = length - 4;

    for (let i = 0; i < remainingLength; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Mélanger le mot de passe pour éviter que les premiers caractères soient toujours les mêmes catégories
    return password.split('').sort(() => 0.5 - Math.random()).join('');
  }

  async create(createUserDto: CreateUserDto) {
    // Générer un mot de passe temporaire (déclaré ici pour être accessible dans le catch)
    const tempPassword = this.generateTempPassword();
    console.log("Mot de passe temporaire généré:", tempPassword);

    try {
      console.log("Création d'un nouvel utilisateur:", createUserDto);

      // Hasher le mot de passe
      const hashedPassword = await this.hashPassword(tempPassword);

      // Traiter les compétences (skills)
      let formattedSkills;
      if (createUserDto.skills) {
        console.log("Skills avant traitement:", createUserDto.skills);
        console.log("Type de skills:", typeof createUserDto.skills);

        if (typeof createUserDto.skills === 'string') {
          try {
            // Si c'est une chaîne JSON, essayer de la parser
            if (createUserDto.skills.startsWith('[') && createUserDto.skills.endsWith(']')) {
              formattedSkills = JSON.parse(createUserDto.skills);
              console.log("Skills après parsing JSON:", formattedSkills);
            } else {
              // Si c'est une chaîne simple, la convertir en tableau avec un seul élément
              formattedSkills = [createUserDto.skills];
              console.log("Skills convertis en tableau:", formattedSkills);
            }
          } catch (e) {
            console.error('Failed to parse skills:', e);
            formattedSkills = [];
          }
        } else if (Array.isArray(createUserDto.skills)) {
          formattedSkills = createUserDto.skills;
          console.log("Skills est déjà un tableau:", formattedSkills);
        } else {
          console.error("Format de skills non reconnu, conversion en tableau vide");
          formattedSkills = [];
        }
      } else {
        formattedSkills = [];
      }

      // Créer l'utilisateur
      const newUser = await this.prisma.user.create({
        data: {
          email: createUserDto.email,
          password: hashedPassword,
          role: createUserDto.role,
          name: createUserDto.name,
          phone: createUserDto.phone,
          location: createUserDto.location,
          about: createUserDto.about,
          skills: formattedSkills,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          location: true,
          about: true,
          skills: true,
          profilePic: true,
        },
      });

      console.log("Nouvel utilisateur créé:", newUser);

      // Envoyer l'email de bienvenue avec le mot de passe temporaire
      try {
        console.log("Envoi de l'email de bienvenue à:", newUser.email);
        await this.mailService.sendWelcomeEmail(
          newUser.email,
          tempPassword,
          newUser.role,
        );
        console.log("Email de bienvenue envoyé avec succès");
      } catch (emailError) {
        console.error("Erreur lors de l'envoi de l'email de bienvenue:", emailError);
        // Ne pas bloquer la création de l'utilisateur si l'envoi de l'email échoue
      }

      return newUser;
    } catch (error) {
      console.error("Erreur lors de la création de l'utilisateur:", error);
      console.log('Database error in create, using fallback creation');

      // Créer un utilisateur de test si Prisma échoue
      const newUser = {
        id: Math.floor(Math.random() * 1000) + 2,
        email: createUserDto.email,
        role: createUserDto.role,
        name: createUserDto.name || createUserDto.email.split('@')[0],
        phone: createUserDto.phone || null,
        profilePic: null,
        location: createUserDto.location || null,
        skills: createUserDto.skills || [],
        about: createUserDto.about || null
      };

      // Ajouter l'utilisateur au stockage temporaire
      this.fallbackUsers.push(newUser);
      console.log('Utilisateur ajouté au stockage temporaire. Total:', this.fallbackUsers.length);

      // Essayer d'envoyer l'email de bienvenue avec le bon mot de passe temporaire
      try {
        console.log("Envoi de l'email de bienvenue (fallback) à:", createUserDto.email);
        console.log("Mot de passe temporaire utilisé:", tempPassword);
        await this.mailService.sendWelcomeEmail(createUserDto.email, tempPassword, createUserDto.role);
        console.log("Email de bienvenue (fallback) envoyé avec succès");
      } catch (emailError) {
        console.error("Erreur lors de l'envoi de l'email de bienvenue (fallback):", emailError);
        console.log('Email sending failed, but user creation continues');
      }

      return newUser;
    }
  }

  async findAll() {
    try {
      console.log('Attempting to fetch users from database...');
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          phone: true,
          location: true,
          about: true,
          skills: true,
          profilePic: true,
        },
      });
      console.log('Successfully fetched users from database:', users.length);
      return users;
    } catch (error) {
      console.error('Database error in findAll:', error.message);
      console.log('Using fallback data due to database connection issue');
      console.log('Returning fallback users:', this.fallbackUsers.length);
      // Retourner les utilisateurs du stockage temporaire
      return this.fallbackUsers;
    }
  }

  async findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        location: true,
        about: true,
        skills: true,
        profilePic: true,
      },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        name: updateUserDto.name,
        role: updateUserDto.role,
        phone: updateUserDto.phone,
        location: updateUserDto.location,
        about: updateUserDto.about,
        skills: updateUserDto.skills as any,
        profilePic: updateUserDto.profilePic,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profilePic: true,
        location: true,
        skills: true,
        about: true,
      },
    });
  }

  async remove(id: number) {
    try {
      console.log('Attempting to delete user with ID:', id);
      const deletedUser = await this.prisma.user.delete({
        where: { id },
      });
      console.log('User deleted from database successfully:', deletedUser);
      return deletedUser;
    } catch (error) {
      console.error('Database error in remove:', error.message);
      console.log('Attempting to delete from fallback storage');

      // Trouver l'utilisateur dans le stockage temporaire
      const userIndex = this.fallbackUsers.findIndex(user => user.id === id);

      if (userIndex === -1) {
        console.error('User not found in fallback storage with ID:', id);
        throw new Error(`User with ID ${id} not found`);
      }

      // Supprimer l'utilisateur du stockage temporaire
      const deletedUser = this.fallbackUsers.splice(userIndex, 1)[0];
      console.log('User deleted from fallback storage:', deletedUser);
      console.log('Remaining users in fallback storage:', this.fallbackUsers.length);

      return deletedUser;
    }
  }

  async findById(id: number) {
    try {
      const numericId = parseInt(String(id), 10);
      if (isNaN(numericId)) throw new Error('ID invalide');

      return this.prisma.user.findUnique({
        where: { id: numericId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          profilePic: true,
          location: true,
          skills: true,
          about: true,
        },
      });
    } catch (error) {
      console.error('Erreur dans findById:', error);
      throw error;
    }
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        profilePic: true,
        location: true,
        skills: true,
        about: true,
      },
    });
  }

  async updateByEmail(email: string, updateUserDto: UpdateUserDto) {
    try {
      console.log("Mise à jour de l'utilisateur avec email:", email);
      console.log("Données reçues:", updateUserDto);

      // Parse skills from string if needed
      if (updateUserDto.skills) {
        console.log("Skills avant traitement:", updateUserDto.skills);
        console.log("Type de skills:", typeof updateUserDto.skills);

        if (typeof updateUserDto.skills === 'string') {
          try {
            // Si c'est une chaîne JSON, essayer de la parser
            if (updateUserDto.skills.startsWith('[') && updateUserDto.skills.endsWith(']')) {
              updateUserDto.skills = JSON.parse(updateUserDto.skills as unknown as string);
              console.log("Skills après parsing JSON:", updateUserDto.skills);
            } else {
              // Si c'est une chaîne simple, la convertir en tableau avec un seul élément
              updateUserDto.skills = [updateUserDto.skills];
              console.log("Skills convertis en tableau:", updateUserDto.skills);
            }
          } catch (e) {
            console.error('Failed to parse skills:', e);
            updateUserDto.skills = [];
          }
        } else if (Array.isArray(updateUserDto.skills)) {
          console.log("Skills est déjà un tableau:", updateUserDto.skills);
        } else {
          console.error("Format de skills non reconnu, conversion en tableau vide");
          updateUserDto.skills = [];
        }
      }

      const updateData: any = {
        name: updateUserDto.name,
        phone: updateUserDto.phone,
        location: updateUserDto.location,
        about: updateUserDto.about,
      };

      if (updateUserDto.skills !== undefined) {
        updateData.skills = updateUserDto.skills;
      }

      if (updateUserDto.profilePic !== undefined) {
        updateData.profilePic = updateUserDto.profilePic;
      }

      return await this.prisma.user.update({
        where: { email },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          profilePic: true,
          location: true,
          skills: true,
          about: true,
        },
      });
    } catch (error) {
      console.error("Erreur dans updateByEmail:", error);
      throw error;
    }
  }

  async updateProfilePic(id: number, profilePicPath: string) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: {
          profilePic: profilePicPath,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          profilePic: true,
          location: true,
          skills: true,
          about: true,
        },
      });
    } catch (error) {
      console.error("Erreur dans updateProfilePic:", error);
      throw error;
    }
  }
}