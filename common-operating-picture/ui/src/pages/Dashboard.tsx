import { Card, CardActionArea, CardMedia, CardContent, Typography, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { pages } from '@/components/Router/config';

export function Dashboard() {
  const navigate = useNavigate();

  const nav = (path: string) => navigate(path);

  return (
    <Grid container spacing={6}>
      {pages.map(p => (
        <Grid item xs={6} md={4} key={p.name}>
          <Card onClick={() => nav(p.path)} key={p.name}>    
            <CardActionArea>
              <CardMedia image={p.image} sx={{ height: '220px' }} />
              <CardContent>
                <Typography gutterBottom variant="h5" component="h2">
                  {p.name}
                </Typography>
                <Typography component="p">{p.description}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
