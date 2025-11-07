import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { Alert, Avatar, Paper } from '@mui/material';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import styled from '@emotion/styled';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { config } from '@/config';

const VirtruLogo = styled.img`
  width: 125px;
  display: inline-block;
  margin: 25px;
`;

const Wrapper = styled(Paper)`
  padding: 1.5rem;
`;

const BigAvatar = styled(Avatar)`
  width: 92px;
  height: 92px;
  text-align: center;
  margin: 0 auto 1rem;
`;

export function Login() {
  const { signIn, error: authCtxError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>(authCtxError || '');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await signIn({ email, password });
      setError('');
    } catch (error: unknown) {
      console.error('Error signing in:', error);
      setError('Invalid email or password. Please try again.');
    }
  };

  const handleKeycloakDirectAuth = async () => {    
    try {
      await signIn({});
      setError('');
    } catch (error: unknown) {
      console.error('Error signing in:', error);
      setError('Unable to Sign into Keycloak. Please try again.');
    }
  };

  useEffect(() => {
    // LOGIN FLOW

    // on pageload
    (async () => {
      // try {
      //   await signIn({});
      //   return;
        
      // } catch (err) {
      //   console.error(err);
      // }
      
      // fetch the openid well-known config values
      const wellKnownRes = await fetch(`${config.dsp.keycloak.serverUrl}/.well-known/openid-configuration`);
      const body = await wellKnownRes.json();
      
      sessionStorage.setItem('dsp:cop:keycloak:auth_endpoint', body.authorization_endpoint);
      sessionStorage.setItem('dsp:cop:keycloak:token_endpoint', body.token_endpoint);
    })();
    // login page renders

    // if user enters user/pass, code works as-is. See handleSubmit

    // if user clicks login with IdP, redict to Keycloak for auth. See handleKeycloakDirectAuth
  }, []);

  return (
    <Container component="main" maxWidth="md">
      <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
        <VirtruLogo src="/img/virtru_Logo_WhiteBlue.png" alt="Virtru" />
        <Wrapper>
          <BigAvatar>L</BigAvatar>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Welcome back!
          </Typography>
          <Typography component="h2" variant="body1" align="center">
            Sign in to your account to continue <br /> <br />
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" variant='filled' sx={{ marginBottom: '1em' }}>
                {error}
              </Alert>
            )}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Sign In
            </Button>
          </Box>
          <Box sx={{ display: config.dsp.keycloak.directAuthEnabled === 'true' ? 'flex' : 'none' , justifyContent: 'center', flexDirection: 'column' }}>
            <Typography component="h2" variant="body1" align="center">
              <br />or Sign in via:<br /> 
            </Typography>
            <Button fullWidth sx={{ mt: 3, mb: 2 }} variant="contained" onClick={handleKeycloakDirectAuth}>
              { new URL(config.dsp.keycloak.serverUrl).host }
            </Button>
          </Box>
        </Wrapper>
      </Box>
    </Container>
  );
}
