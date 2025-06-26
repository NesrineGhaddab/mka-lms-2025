import React, { useEffect, useState } from "react";
import { Box, Button, Typography, Grid } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useTranslation } from 'react-i18next';
import axios from "axios";
import { useNavigate } from "react-router-dom";


const CourseList = () => {
  const { t } = useTranslation();
  const [courses, setCourses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get("http://localhost:8000/courses").then((res) => {
      setCourses(res.data);
    });
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm(t('courses.confirmDelete'))) return;
    await axios.delete(`http://localhost:8000/courses/${id}`);
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const columns = [
    { valueGetter: (value) => {

      return "C-"+value
    },field: "id", headerName: "ID", width: 80 },
    { field: "title", headerName: t('common.title'), flex: 1 },
    {
  field: "actions",
  headerName: t('courses.actions'),
  flex: 1,
  renderCell: (params) => (
    <>
      <Button
        variant="outlined"
        color="primary"
        size="small"
        onClick={() => navigate(`/courses/${params.row.id}/contenus`)}
        style={{ marginRight: 8 }}
      >
        {t('courses.viewContent')}
      </Button>

      <Button
        variant="outlined"
        color="error"
        size="small"
        onClick={() => handleDelete(params.row.id)}
      >
        {t('common.delete')}
      </Button>
    </>
  ),
}
 ];

  return (
    <Box mt={4}>
      <Grid container justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">{t('courses.courseList')}</Typography>
        <Button variant="contained" onClick={() => navigate("/courses/add")}>
          ➕ {t('courses.addCourse')}
        </Button>
      </Grid>

      <Box sx={{ height: 400 }}>
        <DataGrid
          rows={courses}
          columns={columns}
          pageSize={5}
          rowsPerPageOptions={[5]}
          getRowId={(row) => row.id}
        />
      </Box>
    </Box>
  );
};

export default CourseList;
