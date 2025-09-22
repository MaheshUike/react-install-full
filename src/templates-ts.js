function getTemplates(cfg = {}) {
  const files = {};

  // ---------------- PUBLIC FILES ----------------
  files['public/index.html'] = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="React app scaffolded by react-install-full" />
    <title>React App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`;

  files['public/manifest.json'] = `{
  "short_name": "App",
  "name": "React App",
  "icons": [{
    "src": "favicon.ico",
    "sizes": "64x64 32x32 24x24 16x16",
    "type": "image/x-icon"
  }],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}`;

  // ---------------- ENTRYPOINT ----------------
  files['src/index.tsx'] = `
import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './App';
${cfg.includeRedux ? "import { Provider } from 'react-redux';\nimport { store } from './store';" : ""}
${cfg.includeContext ? "import { ThemeProvider } from './context/ThemeContext';\nimport { NotificationProvider } from './context/NotificationContext';" : ""}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    ${cfg.includeRedux ? "<Provider store={store}>" : ""}
    ${cfg.includeContext ? "<ThemeProvider><NotificationProvider>" : ""}
      <App />
    ${cfg.includeContext ? "</NotificationProvider></ThemeProvider>" : ""}
    ${cfg.includeRedux ? "</Provider>" : ""}
  </React.StrictMode>
);`;

  // ---------------- APP ----------------
  const routerImports = cfg.includeRouter
    ? "import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';"
    : "";

  const aboutComponent = cfg.includeRouter
    ? `function About(){return(<div style={{padding:'2rem'}}><h1>About</h1><p>Scaffolded by react-install-full.</p></div>);}`
    : "";

  const appBody = cfg.includeRouter
    ? `<Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
        </Routes>
        ${cfg.includeContext ? "<NotificationList />" : ""}
      </Router>`
    : `<div className="App">
        <Navbar />
        <Home />
        ${cfg.includeContext ? "<NotificationList />" : ""}
      </div>`;

  files['src/App.tsx'] = `
import React from 'react';
${routerImports}
import './styles/App.css';
import Home from './components/Home';
import Navbar from './components/Navbar';
${cfg.includeContext ? "import NotificationList from './components/common/NotificationList';" : ""}
${aboutComponent}

export default function App(){
  return (${appBody});
}
`;

  // ---------------- STYLES ----------------
  const baseCss = `*{box-sizing:border-box}
html,body,#root{height:100%}
body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial}
`;

  files['src/styles/index.css'] = cfg.includeTailwind
    ? `@tailwind base;
@tailwind components;
@tailwind utilities;

${baseCss}`
    : baseCss;

  files['src/styles/App.css'] = `.App{text-align:left}
button:hover{opacity:.9;transition:opacity .2s ease}
`;

  // ---------------- CONTEXT ----------------
  if (cfg.includeContext) {
    files['src/context/ThemeContext.tsx'] = `
import React, {createContext,useContext,useReducer,ReactNode} from 'react';

type Theme = 'light' | 'dark';
interface ThemeState { theme: Theme }
interface ThemeContextValue { theme: Theme; toggle:()=>void }

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const initial: ThemeState = { theme: 'light' };

function reducer(s:ThemeState,a:{type:'TOGGLE'}):ThemeState{
  if(a.type==='TOGGLE') return { theme: s.theme==='light'?'dark':'light' };
  return s;
}

export function ThemeProvider({children}:{children:ReactNode}){
  const [state,dispatch]=useReducer(reducer,initial);
  const value:ThemeContextValue = { theme: state.theme, toggle:()=>dispatch({type:'TOGGLE'}) };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(){
  const c=useContext(ThemeContext);
  if(!c) throw new Error('useTheme must be used inside ThemeProvider');
  return c;
}
`;

    files['src/context/NotificationContext.tsx'] = `
import React,{createContext,useContext,useReducer,ReactNode} from 'react';

interface Notification { id:number; m:string; t:string; d:number }
interface NotificationState { list:Notification[] }
interface NotificationContextValue {
  list:Notification[];
  add:(m:string,t?:string,d?:number)=>void;
  remove:(id:number)=>void;
  clear:()=>void;
}

const C = createContext<NotificationContextValue|undefined>(undefined);

type Action =
 | {type:'ADD';payload:Notification}
 | {type:'REMOVE';payload:number}
 | {type:'CLEAR'}

function reducer(s:NotificationState,a:Action):NotificationState{
  switch(a.type){
    case 'ADD': return {...s,list:[a.payload,...s.list].slice(0,5)};
    case 'REMOVE': return {...s,list:s.list.filter(n=>n.id!==a.payload)};
    case 'CLEAR': return {...s,list:[]};
    default: return s;
  }
}

export function NotificationProvider({children}:{children:ReactNode}){
  const [state,dispatch]=useReducer(reducer,{list:[]});
  const add=(m:string,t='info',d=3000)=>{
    const id=Date.now()+Math.random();
    dispatch({type:'ADD',payload:{id,m,t,d}});
    if(d>0) setTimeout(()=>dispatch({type:'REMOVE',payload:id}),d);
  };
  const value:NotificationContextValue={list:state.list,add,remove:(id)=>dispatch({type:'REMOVE',payload:id}),clear:()=>dispatch({type:'CLEAR'})};
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useNotification(){
  const c=useContext(C);
  if(!c) throw new Error('useNotification must be used inside NotificationProvider');
  return c;
}
`;

    files['src/components/common/NotificationList.tsx'] = `
import React from 'react';
import { useNotification } from '../../context/NotificationContext';

export default function NotificationList(){
  const {list,remove} = useNotification();
  if(!list.length) return null;
  return <div style={{position:'fixed',top:16,right:16,display:'grid',gap:8,zIndex:50}}>
    {list.map(n=><div key={n.id} style={{padding:'12px 14px',borderRadius:8,background:'#111',color:'#fff',minWidth:260}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:12}}>
        <div>{n.m}</div>
        <button onClick={()=>remove(n.id)} style={{background:'none',color:'#bbb',border:'none',cursor:'pointer'}}>×</button>
      </div>
    </div>)}
  </div>;
}
`;
  }

  // ---------------- REDUX ----------------
  if (cfg.includeRedux) {
    files['src/store/index.ts'] = `
import { configureStore } from '@reduxjs/toolkit';
import counter from './slices/counterSlice';
export const store = configureStore({ reducer: { counter }});
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
`;

    files['src/store/slices/counterSlice.ts'] = `
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CounterState { value:number }
const initialState:CounterState = { value:0 };

const slice = createSlice({
  name:'counter',
  initialState,
  reducers:{
    inc:(s)=>{s.value++},
    dec:(s)=>{s.value--},
    add:(s,a:PayloadAction<number>)=>{s.value+=a.payload}
  }
});

export const { inc, dec, add } = slice.actions;
export default slice.reducer;
`;

    files['src/hooks/useCounter.ts'] = `
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { inc, dec, add } from '../store/slices/counterSlice';

export function useCounter(){
  const dispatch:AppDispatch = useDispatch();
  const value = useSelector((s:RootState)=>s.counter.value);
  return { value, inc:()=>dispatch(inc()), dec:()=>dispatch(dec()), add:(n:number)=>dispatch(add(n)) };
}
`;
  }

  // ---------------- COMPONENTS ----------------
  files['src/components/Navbar.tsx'] = `
import React from 'react';
${cfg.includeRouter ? "import { Link, useLocation } from 'react-router-dom';" : ""}
${cfg.includeContext ? "import { useTheme } from '../context/ThemeContext';" : ""}

export default function Navbar(){
  ${cfg.includeRouter ? "const location = useLocation();" : ""}
  ${cfg.includeContext ? "const { theme, toggle } = useTheme();" : ""}
  const link:React.CSSProperties = { color:'#fff',textDecoration:'none',marginRight:12 };
  const nav:React.CSSProperties = { display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px', background:'#111',color:'#fff' };
  return (
    <nav style={nav}>
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <strong>React Starter</strong>
        ${cfg.includeRouter ? `<Link to="/" style={link}>Home</Link><Link to="/about" style={link}>About</Link>` : ``}
      </div>
      <div>
        ${cfg.includeContext ? `<button onClick={toggle} style={{background:'#333',color:'#fff',border:'1px solid #444',padding:'6px 10px',borderRadius:6}}>
          Toggle Theme ({theme})
        </button>` : ``}
      </div>
    </nav>
  );
}
`;

  files['src/components/Home.tsx'] = `
import React from 'react';
${cfg.includeRedux ? "import { useCounter } from '../hooks/useCounter';" : ""}
${cfg.includeContext ? "import { useNotification } from '../context/NotificationContext';" : ""}
${cfg.includeAxios ? "import axios from 'axios';" : ""}

export default function Home(){
  ${cfg.includeRedux ? "const { value, inc, dec, add } = useCounter();" : ""}
  ${cfg.includeContext ? "const { add: notify } = useNotification();" : ""}
  ${cfg.includeAxios ? "async function testCall(){ try{ await axios.get('https://httpbin.org/get'); " +
    (cfg.includeContext ? "notify('Axios GET ✓','success');" : "console.log('Axios GET ✓');") +
    " }catch{ " + (cfg.includeContext ? "notify('Axios error','error');" : "console.error('Axios error');") + " } }" : ""}

  return (
    <div style={{padding:'2rem'}}>
      <h1>Welcome 👋</h1>
      <p>Your scaffolded app is ready.</p>

      ${cfg.includeRedux ? `
      <div style={{marginTop:16}}>
        <h3>Redux Counter</h3>
        <p>Value: <strong>{value}</strong></p>
        <div style={{display:'flex',gap:8}}>
          <button onClick={inc}>+1</button>
          <button onClick={dec}>-1</button>
          <button onClick={()=>add(5)}>+5</button>
        </div>
      </div>` : ""}

      ${cfg.includeContext ? `
      <div style={{marginTop:16}}>
        <h3>Notifications</h3>
        <button onClick={()=>notify('Hello from Notification!','info')}>Show Info</button>
      </div>` : ""}

      ${cfg.includeAxios ? `
      <div style={{marginTop:16}}>
        <h3>Axios Test</h3>
        <button onClick={testCall}>Call httpbin.org</button>
      </div>` : ""}
    </div>
  );
}
`;

  // ---------------- UTILS ----------------
  files['src/utils/constants.ts'] = `export const API_BASE_URL = process.env.REACT_APP_API_URL || '';`;

  return files;
}

  // ---------------- ENV FILES ----------------
  files['.env'] = `REACT_APP_API_URL=https://api.example.com
REACT_APP_ENV=development
`;

  files['.gitignore'] = `node_modules
.env
dist
build
`;


module.exports = { getTemplates };
