import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Container,
  Typography,
  Divider,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Collapse,
  TextField,
  Badge,
  Stack,
  Chip,
} from "@mui/material";
import {
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";

import { toast } from "react-toastify";

const Section = ({ title, items, renderItem, expanded, onToggle }) => (
  <Box component={Paper} elevation={2} sx={{ p: 2, mb: 4 }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Badge badgeContent={items.length} color="primary">
        <Typography variant="h6">{title}</Typography>
      </Badge>
      <IconButton onClick={onToggle}>
        {expanded ? <ExpandLess /> : <ExpandMore />}
      </IconButton>
    </Box>

    <Collapse in={expanded}>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Aucun(e) {title.toLowerCase()} trouvé(e).
        </Typography>
      ) : (
        <List dense>
          {items.map((item) => (
            <ListItem key={item.id} alignItems="flex-start">
              <ListItemText
                primary={renderItem(item)}
                />
            </ListItem>
          ))}
        </List>
      )}
    </Collapse>
  </Box>
);

export default function SessionsOverviewPage() {
  const [sessions, setSessions] = useState([]);
  const [search, setSearch] = useState("");
  const [showSessions, setShowSessions] = useState(true);


  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = () => {
    axios.get("http://localhost:8000/sessions")
      .then((res) => setSessions(res.data))
      .catch(() => toast.error("Erreur chargement sessions."));
  };

  const filterBySearch = (s) =>
    s.program?.name?.toLowerCase().includes(search.toLowerCase());

  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        🎓 Vue d'ensemble des sessions
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <TextField
        fullWidth
        label="Rechercher une session par programme"
        variant="outlined"
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3 }}
      />

      <Section
        title="Sessions"
        items={sessions.filter(filterBySearch)}
        expanded={showSessions}
        onToggle={() => setShowSessions((prev) => !prev)}
        renderItem={(session) => (
          <Box>
            <Typography variant="subtitle1">{session.program.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              Du {new Date(session.startDate).toLocaleDateString()} au {new Date(session.endDate).toLocaleDateString()}
            </Typography>
            <Box mt={1}>
              {session.modules.map((m) => (
                <Box key={m.id} mb={1}>
                  <Typography fontWeight="bold">📦 {m.module.name}</Typography>
                  {(m.courses || []).map((c) => (
                    <Box key={c.id} ml={2} mt={1}>
                      <Typography variant="body2">📘 {c.course.title}</Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" mt={1}>
                        {(c.contenus || []).map((ct) => (
                          <Chip
                            key={ct.id}
                            label={`📄 ${ct.contenu.title}`}
                            size="small"
                            onClick={() => window.open(ct.contenu.fileUrl, "_blank")}
                            sx={{ cursor: "pointer" }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      />
    </Container>
  );
}
