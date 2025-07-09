import React, { useState } from "react";
import ThreeBG from "./ThreeBG";
import ZiraMusicRoom from "./ZiraMusicRoom";
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

function App() {
  const [authOpen, setAuthOpen] = useState(true);
  const [tab, setTab] = useState(0);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState(localStorage.getItem("zira_jwt") || "");
  const [user, setUser] = useState(localStorage.getItem("zira_username") || "");

  const handleAuth = async () => {
    try {
      const endpoint = tab === 0 ? "/api/login" : "/api/register";
      const res = await axios.post(BACKEND_URL + endpoint, { username, password });
      setToken(res.data.token);
      setUser(res.data.username);
      localStorage.setItem("zira_jwt", res.data.token);
      localStorage.setItem("zira_username", res.data.username);
      setAuthOpen(false);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Auth failed");
    }
  };

  return (
    <div>
      <ThreeBG />
      <ZiraMusicRoom username={user} token={token} />
      <Dialog open={authOpen} disableEscapeKeyDown>
        <DialogTitle>{tab === 0 ? "Login" : "Register"}</DialogTitle>
        <DialogContent>
          <Tabs value={tab} onChange={(_, v) => { setTab(v); setError(""); }}>
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>
          <TextField
            autoFocus
            margin="dense"
            label="Username"
            fullWidth
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAuth} variant="contained">{tab === 0 ? "Login" : "Register"}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export default App;
