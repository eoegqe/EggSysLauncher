import React, { useState, useEffect } from 'react';
import { Package, Download, Sparkles, Palette, Code, Eye, CheckCircle, HardDrive, Monitor, Heart, Star, Music, Image, Video, Camera, Mail, Phone, MessageSquare, Calendar, Clock, Map, Compass, Cloud, Sun, Moon, Zap, Coffee, Book, Briefcase, ShoppingCart, CreditCard, Gift, Trophy, Upload, Copy, Maximize2, Save, FileCode, Lightbulb, Glasses } from 'lucide-react';

const ICON_MAP = {
  Package, Heart, Star, Music, Image, Video, Camera,
  Mail, Phone, MessageSquare, Calendar, Clock, Map,
  Compass, Cloud, Sun, Moon, Zap, Coffee, Book,
  Briefcase, ShoppingCart, CreditCard, Gift, Trophy
};
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { moderateAppContent } from '@/lib/contentModeration';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/lib/devToast';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { confirmAction } from '@/components/os/ConfirmDialog';
import ReactZipUploader from '@/components/os/apps/ReactZipUploader';
import { isReactZipApp, assembleReactZipHtml, REACT_ZIP_SENTINEL } from '@/lib/reactZip';
import { buildEafBlob, buildEafBase64, parseEaf, buildLicenseText } from '@/lib/eafFormat';
import { offloadReactZip } from '@/lib/reactZipStorage';

const iconOptions = [
  'Package', 'Heart', 'Star', 'Music', 'Image', 'Video', 'Camera', 
  'Mail', 'Phone', 'MessageSquare', 'Calendar', 'Clock', 'Map',
  'Compass', 'Cloud', 'Sun', 'Moon', 'Zap', 'Coffee', 'Book',
  'Briefcase', 'ShoppingCart', 'CreditCard', 'Gift', 'Trophy'
];

const colorOptions = [
  { name: 'Blue', value: 'from-blue-500 to-cyan-500' },
  { name: 'Purple', value: 'from-purple-500 to-pink-500' },
  { name: 'Green', value: 'from-green-500 to-emerald-500' },
  { name: 'Yellow', value: 'from-yellow-500 to-orange-500' },
  { name: 'Red', value: 'from-red-500 to-rose-500' },
  { name: 'Indigo', value: 'from-indigo-500 to-blue-500' },
  { name: 'Pink', value: 'from-pink-500 to-rose-500' },
  { name: 'Teal', value: 'from-teal-500 to-cyan-500' },
  { name: 'Orange', value: 'from-orange-500 to-amber-500' },
  { name: 'Gray', value: 'from-gray-500 to-slate-500' }
];

const LANGUAGE_OPTIONS = [
  { id: 'html', name: 'HTML', description: 'Standard HTML/CSS/JS' },
  { id: 'javascript', name: 'JavaScript', description: 'Pure JavaScript app' },
  { id: 'react', name: 'React (JSX)', description: 'React component (compiled)' }
];

const defaultHTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      padding: 40px;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      text-align: center;
      max-width: 500px;
    }
    h1 {
      color: #333;
      margin: 0 0 20px 0;
    }
    p {
      color: #666;
      line-height: 1.6;
    }
    button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 10px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 20px;
    }
    button:hover {
      transform: scale(1.05);
      box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to My App! 🎉</h1>
    <p>This is a custom EggetSystem application created with HTML, CSS, and JavaScript.</p>
    <button onclick="alert('Hello from your custom app!')">Click Me!</button>
  </div>
</body>
</html>`;

export default function AppCreator() {
  const [appData, setAppData] = useState({
    name: '',
    app_id: '',
    version: '1.0.0',
    description: '',
    icon: 'Package',
    color: 'from-blue-500 to-cyan-500',
    language: 'html',
    html_content: defaultHTML,
    react_zip: null,
    vr_enabled: false,
    license_name: ''
  });

  const [previewMode, setPreviewMode] = useState('code');
  const isZipApp = isReactZipApp(appData.html_content);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user-appcreator'],
    queryFn: () => base44.auth.me()
  });

  // Check for creation suspension
  const isCreationSuspended = user?.creation_suspended && 
    (!user?.creation_suspension_expires || new Date(user.creation_suspension_expires) > new Date());

  // Auto-save to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      if (appData.name || appData.html_content !== defaultHTML) {
        localStorage.setItem('app_creator_draft', JSON.stringify(appData));
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [appData]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('app_creator_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.name) {
          setAppData(parsed);
          toast.success('Draft loaded');
        }
      } catch (e) {}
    }
  }, []);

  // Default the license name from the dev's profile once it arrives.
  useEffect(() => {
    if (user && !appData.license_name) {
      const name = user.full_name || user.username || '';
      if (name) handleChange('license_name', name);
    }
  }, [user]);

  const handleChange = (field, value) => {
    setAppData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-generate app_id from name
      if (field === 'name' && !prev.app_id) {
        newData.app_id = value.toLowerCase().replace(/[^a-z0-9]/g, '_');
      }
      
      return newData;
    });
  };

  const handleZipExtracted = (payload) => {
    setAppData(prev => ({
      ...prev,
      language: 'react',
      html_content: REACT_ZIP_SENTINEL,
      react_zip: payload,
      // Auto-name from the zip if the dev hasn't typed one yet.
      name: prev.name || (payload.entry ? payload.entry.split('/')[0] : 'React App'),
    }));
    setPreviewMode('preview');
  };

  const validateForm = () => {
    if (!appData.name.trim()) {
      toast.error('Please enter an app name');
      return false;
    }
    if (!appData.app_id.trim()) {
      toast.error('Please enter an app ID');
      return false;
    }
    if (!appData.version.trim()) {
      toast.error('Please enter a version');
      return false;
    }
    if (!appData.license_name.trim()) {
      toast.error('Please enter a license holder name (company or creator)');
      return false;
    }
    return true;
  };

  const downloadToDevice = async () => {
    if (isCreationSuspended) {
      toast.error('Your app creation privileges are currently suspended');
      return;
    }

    const blob = await buildEafBlob(appData);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appData.app_id}.eaf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Downloaded to your device!`);
    setShowDownloadDialog(false);

    // Ask to publish to App Store
    setTimeout(() => {
      setShowPublishDialog(true);
    }, 500);
  };

  const handlePublishToStore = async () => {
    if (isCreationSuspended) {
      toast.error('Your app creation privileges are currently suspended');
      return;
    }

    try {
      const category = prompt('Select category: Productivity, Utilities, Games, Creative, Entertainment, Education, Finance, Health, Other', 'Utilities');
      if (!category) return;

      // Auto-mod: scan app content for inappropriate material before publishing.
      const modResult = await moderateAppContent(appData.name, appData.description, appData.html_content);
      if (modResult.inappropriate) {
        toast.error(`App rejected by auto-mod: ${modResult.category}. ${modResult.reason}`);
        return;
      }

      const stored = await offloadReactZip(appData);
      const license_text = buildLicenseText(appData.license_name);
      await base44.entities.PublishedApp.create({
        name: appData.name,
        app_id: appData.app_id,
        version: appData.version,
        description: appData.description,
        category: category,
        icon: appData.icon,
        color: appData.color,
        html_content: appData.html_content,
        app_data: { ...stored, license_text },
        vr_enabled: appData.vr_enabled || false,
        developer_nickname: user?.username || null,
        permissions: [],
        status: 'pending'
      });

      // Award 10 credits for creating and submitting an app
      await base44.auth.updateMe({ app_credits: (user?.app_credits || 0) + 10 });
      queryClient.invalidateQueries({ queryKey: ['current-user-appcreator'] });

      // Send email notification to all admins for review
      const admins = await base44.entities.AdminWhitelist.filter({ is_active: true });
      if (admins.length > 0) {
        await Promise.all(admins.map(admin =>
          base44.integrations.Core.SendEmail({
            to: admin.email,
            subject: `[APP SUBMISSION] ${appData.name}`,
            body: `New app submitted for review:\n\nName: ${appData.name}\nApp ID: ${appData.app_id}\nVersion: ${appData.version}\nCategory: ${category}\nDescription: ${appData.description || 'No description'}\n\nPlease review this submission in the admin dashboard.`
          })
        ));
      }

      toast.success('App submitted to App Store! It will be reviewed shortly. 🎉');
    } catch (error) {
      toast.error('Failed to publish: ' + error.message);
    }
  };

  const downloadToEggetSystem = async () => {
    if (isCreationSuspended) {
      toast.error('Your app creation privileges are currently suspended');
      return;
    }

    try {
      const eafBase64 = await buildEafBase64(appData);
      await base44.entities.File.create({
        name: `${appData.app_id}.eaf`,
        content: eafBase64,
        type: 'application/zip',
        path: `/${appData.app_id}.eaf`
      });

      toast.success(`Saved to EggetSystem Files!`);
      setShowDownloadDialog(false);

      // Ask to publish to App Store
      setTimeout(() => {
        setShowPublishDialog(true);
      }, 500);
    } catch (error) {
      toast.error('Failed to save to EggetSystem Files');
    }
  };

  const handleDownloadClick = () => {
    if (!validateForm()) return;
    setShowDownloadDialog(true);
  };

  const installApp = async () => {
    if (isCreationSuspended) {
      toast.error('Your app creation privileges are currently suspended');
      return;
    }

    if (!validateForm()) return;

    setIsInstalling(true);
    try {
      // Check if already installed
      const existing = await base44.entities.InstalledApp.list();
      if (existing.find(app => app.app_id === appData.app_id)) {
        toast.error('An app with this ID is already installed');
        setIsInstalling(false);
        return;
      }

      const stored = await offloadReactZip(appData);
      const license_text = buildLicenseText(appData.license_name);
      await base44.entities.InstalledApp.create({
        name: appData.name,
        app_id: appData.app_id,
        version: appData.version,
        description: appData.description || 'No description',
        icon: appData.icon,
        color: appData.color,
        html_content: getCompiledContent(),
        app_data: { ...stored, license_text },
        vr_enabled: appData.vr_enabled || false,
        permissions: []
      });

      queryClient.invalidateQueries({ queryKey: ['installed-apps'] });
      queryClient.invalidateQueries({ queryKey: ['installed-apps-mobile'] });
      toast.success(`${appData.name} installed successfully!`);
      
      // Clear draft and reset
      localStorage.removeItem('app_creator_draft');
      setAppData({
        name: '',
        app_id: '',
        version: '1.0.0',
        description: '',
        icon: 'Package',
        color: 'from-blue-500 to-cyan-500',
        language: 'html',
        html_content: defaultHTML,
        react_zip: null,
        vr_enabled: false,
        license_name: appData.license_name
      });
    } catch (error) {
      toast.error('Installation failed: ' + error.message);
    }
    setIsInstalling(false);
  };

  const resetForm = async () => {
    if (await confirmAction('Clear all data? This cannot be undone.')) {
      setAppData({
        name: '',
        app_id: '',
        version: '1.0.0',
        description: '',
        icon: 'Package',
        color: 'from-blue-500 to-cyan-500',
        language: 'html',
        html_content: defaultHTML,
        react_zip: null,
        vr_enabled: false,
        license_name: ''
      });
      localStorage.removeItem('app_creator_draft');
      toast.success('Form cleared');
    }
  };

  const duplicateApp = () => {
    setAppData(prev => ({
      ...prev,
      name: prev.name + ' (Copy)',
      app_id: prev.app_id + '_copy',
      version: '1.0.0'
    }));
    toast.success('App duplicated');
  };

  const importFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.eaf,.eafl,.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        if (file.name.endsWith('.eaf') || file.name.endsWith('.eafl')) {
          const data = await parseEaf(file, file.name);
          setAppData(data);
        } else {
          const text = await file.text();
          setAppData(JSON.parse(text));
        }
        toast.success('App imported successfully!');
      } catch (error) {
        toast.error('Invalid file format: ' + (error.message || ''));
      }
    };
    input.click();
  };

  const insertSnippet = (snippet) => {
    handleChange('html_content', appData.html_content + '\n\n' + snippet);
    setShowSnippets(false);
    toast.success('Snippet inserted');
  };

  const getCompiledContent = () => {
    if (isZipApp) {
      return assembleReactZipHtml(appData.react_zip);
    }
    if (appData.language === 'html') {
      return appData.html_content;
    }
    
    if (appData.language === 'javascript') {
      return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
${appData.html_content}
  </script>
</body>
</html>`;
    }
    
    if (appData.language === 'react') {
      return `<!DOCTYPE html>
<html>
<head>
  <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
${appData.html_content}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  </script>
</body>
</html>`;
    }
    
    return appData.html_content;
  };

  const getLanguageTemplate = (lang) => {
    if (lang === 'javascript') {
      return `// JavaScript App
const app = document.getElementById('app');

app.innerHTML = \`
  <div style="text-align: center; padding: 40px;">
    <h1>🚀 My JavaScript App</h1>
    <p>Built with pure JavaScript!</p>
    <button id="clickBtn" style="padding: 12px 24px; font-size: 16px; cursor: pointer;">
      Click Me!
    </button>
    <p id="counter">Clicks: 0</p>
  </div>
\`;

let count = 0;
document.getElementById('clickBtn').addEventListener('click', () => {
  count++;
  document.getElementById('counter').textContent = 'Clicks: ' + count;
});`;
    }
    
    if (lang === 'react') {
      return `// React Component
function App() {
  const [count, setCount] = React.useState(0);
  
  return (
    <div style={{ textAlign: 'center', padding: '40px' }}>
      <h1>⚛️ My React App</h1>
      <p>Built with React!</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{ padding: '12px 24px', fontSize: '16px', cursor: 'pointer' }}
      >
        Count: {count}
      </button>
    </div>
  );
}`;
    }
    
    return defaultHTML;
  };

  const codeSnippets = {
    button: `<button onclick="handleClick()">Click Me</button>
<script>
function handleClick() {
  alert('Button clicked!');
}
</script>`,
    form: `<form onsubmit="handleSubmit(event)">
  <input type="text" id="nameInput" placeholder="Enter name">
  <button type="submit">Submit</button>
</form>
<script>
function handleSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('nameInput').value;
  alert('Hello, ' + name + '!');
}
</script>`,
    modal: `<button onclick="openModal()">Open Modal</button>
<div id="modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.5); padding:20px;">
  <div style="background:white; max-width:400px; margin:100px auto; padding:20px; border-radius:10px;">
    <h2>Modal Title</h2>
    <p>Modal content here</p>
    <button onclick="closeModal()">Close</button>
  </div>
</div>
<script>
function openModal() { document.getElementById('modal').style.display = 'block'; }
function closeModal() { document.getElementById('modal').style.display = 'none'; }
</script>`,
    tabs: `<div class="tabs">
  <button onclick="showTab(1)">Tab 1</button>
  <button onclick="showTab(2)">Tab 2</button>
  <button onclick="showTab(3)">Tab 3</button>
</div>
<div id="tab1" class="tab-content">Content 1</div>
<div id="tab2" class="tab-content" style="display:none">Content 2</div>
<div id="tab3" class="tab-content" style="display:none">Content 3</div>
<script>
function showTab(n) {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.getElementById('tab' + n).style.display = 'block';
}
</script>`,
    timer: `<div id="timer">00:00</div>
<button onclick="startTimer()">Start</button>
<button onclick="stopTimer()">Stop</button>
<script>
let seconds = 0, interval;
function startTimer() {
  interval = setInterval(() => {
    seconds++;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    document.getElementById('timer').textContent = 
      (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
  }, 1000);
}
function stopTimer() { clearInterval(interval); }
</script>`,
    darkmode: `<button onclick="toggleDarkMode()">Toggle Dark Mode</button>
<script>
function toggleDarkMode() {
  document.body.classList.toggle('dark');
  document.body.style.background = 
    document.body.classList.contains('dark') ? '#1a1a1a' : 'white';
  document.body.style.color = 
    document.body.classList.contains('dark') ? 'white' : 'black';
}
</script>`
  };

  const insertTemplate = (template) => {
    const templates = {
      basic: defaultHTML,
      weather: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 20px; font-family: Arial; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
    .card { max-width: 400px; margin: 50px auto; background: white; padding: 30px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); text-align: center; }
    input { width: 100%; padding: 12px; margin: 10px 0; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; }
    button { width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; margin-top: 10px; }
    button:hover { background: #764ba2; }
    .weather-info { margin-top: 20px; font-size: 18px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🌤️ Weather App</h1>
    <input type="text" id="city" placeholder="Enter city name">
    <button onclick="getWeather()">Get Weather</button>
    <div id="result" class="weather-info"></div>
  </div>
  <script>
    function getWeather() {
      const city = document.getElementById('city').value;
      const result = document.getElementById('result');
      if (!city) {
        result.innerHTML = '❌ Please enter a city';
        return;
      }
      // Simulated weather data
      const temps = [15, 18, 22, 25, 28, 20, 12];
      const temp = temps[Math.floor(Math.random() * temps.length)];
      const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'];
      const condition = conditions[Math.floor(Math.random() * conditions.length)];
      result.innerHTML = \`<h2>\${city}</h2><p>🌡️ \${temp}°C</p><p>\${condition}</p>\`;
    }
  </script>
</body>
</html>`,
      notes: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 20px; font-family: Arial; background: #f0f0f0; }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { color: #333; }
    textarea { width: 100%; height: 200px; padding: 15px; border: 2px solid #ddd; border-radius: 10px; font-size: 16px; margin-bottom: 10px; }
    button { padding: 12px 24px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; margin-right: 10px; }
    button:hover { background: #764ba2; }
    .notes-list { margin-top: 20px; }
    .note { background: white; padding: 15px; margin-bottom: 10px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
  </style>
</head>
<body>
  <div class="container">
    <h1>📝 Note Taker</h1>
    <textarea id="noteInput" placeholder="Write your note..."></textarea>
    <button onclick="saveNote()">Save Note</button>
    <button onclick="clearNotes()">Clear All</button>
    <div id="notesList" class="notes-list"></div>
  </div>
  <script>
    let notes = JSON.parse(localStorage.getItem('notes') || '[]');
    
    function saveNote() {
      const input = document.getElementById('noteInput');
      if (input.value.trim()) {
        notes.push({ text: input.value, date: new Date().toLocaleString() });
        localStorage.setItem('notes', JSON.stringify(notes));
        input.value = '';
        renderNotes();
      }
    }
    
    async function clearNotes() {
      if (await confirmAction('Delete all notes?')) {
        notes = [];
        localStorage.setItem('notes', JSON.stringify(notes));
        renderNotes();
      }
    }
    
    function renderNotes() {
      document.getElementById('notesList').innerHTML = notes.map((note, i) => 
        \`<div class="note"><strong>\${note.date}</strong><p>\${note.text}</p></div>\`
      ).join('');
    }
    
    renderNotes();
  </script>
</body>
</html>`,
      quiz: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 20px; font-family: Arial; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
    .quiz-container { max-width: 600px; margin: 50px auto; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    h1 { color: #333; margin-bottom: 20px; }
    .question { margin-bottom: 20px; }
    button { padding: 12px 24px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; margin: 5px; }
    button:hover { background: #764ba2; }
    .result { margin-top: 20px; padding: 15px; background: #f0f0f0; border-radius: 8px; }
  </style>
</head>
<body>
  <div class="quiz-container">
    <h1>🧠 Quiz App</h1>
    <div id="quiz"></div>
    <div id="result"></div>
  </div>
  <script>
    const questions = [
      { q: 'What is 2 + 2?', answers: ['3', '4', '5'], correct: 1 },
      { q: 'What is the capital of France?', answers: ['London', 'Berlin', 'Paris'], correct: 2 },
      { q: 'Which planet is closest to the Sun?', answers: ['Venus', 'Mercury', 'Mars'], correct: 1 }
    ];
    
    let currentQ = 0, score = 0;
    
    function showQuestion() {
      if (currentQ >= questions.length) {
        document.getElementById('quiz').innerHTML = '';
        document.getElementById('result').innerHTML = 
          \`<h2>Quiz Complete!</h2><p>Score: \${score}/\${questions.length}</p><button onclick="restart()">Restart</button>\`;
        return;
      }
      
      const q = questions[currentQ];
      document.getElementById('quiz').innerHTML = 
        \`<div class="question"><h3>\${q.q}</h3>\` +
        q.answers.map((a, i) => \`<button onclick="answer(\${i})">\${a}</button>\`).join('') +
        \`</div>\`;
    }
    
    function answer(i) {
      if (i === questions[currentQ].correct) score++;
      currentQ++;
      showQuestion();
    }
    
    function restart() {
      currentQ = 0;
      score = 0;
      document.getElementById('result').innerHTML = '';
      showQuestion();
    }
    
    showQuestion();
  </script>
</body>
</html>`,
      calculator: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 20px; font-family: Arial; background: #f0f0f0; }
    .calc { max-width: 300px; margin: 50px auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
    input { width: 100%; padding: 15px; font-size: 24px; text-align: right; border: 1px solid #ddd; border-radius: 5px; margin-bottom: 10px; }
    .buttons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    button { padding: 20px; font-size: 18px; border: none; background: #667eea; color: white; border-radius: 5px; cursor: pointer; }
    button:hover { background: #764ba2; }
  </style>
</head>
<body>
  <div class="calc">
    <input type="text" id="display" readonly value="0">
    <div class="buttons">
      <button onclick="clearDisplay()">C</button>
      <button onclick="appendToDisplay('/')">/</button>
      <button onclick="appendToDisplay('*')">*</button>
      <button onclick="appendToDisplay('-')">-</button>
      <button onclick="appendToDisplay('7')">7</button>
      <button onclick="appendToDisplay('8')">8</button>
      <button onclick="appendToDisplay('9')">9</button>
      <button onclick="appendToDisplay('+')">+</button>
      <button onclick="appendToDisplay('4')">4</button>
      <button onclick="appendToDisplay('5')">5</button>
      <button onclick="appendToDisplay('6')">6</button>
      <button onclick="calculate()" style="grid-row: span 2; background: #28a745;">=</button>
      <button onclick="appendToDisplay('1')">1</button>
      <button onclick="appendToDisplay('2')">2</button>
      <button onclick="appendToDisplay('3')">3</button>
      <button onclick="appendToDisplay('0')" style="grid-column: span 2;">0</button>
      <button onclick="appendToDisplay('.')">.</button>
    </div>
  </div>
  <script>
    function appendToDisplay(val) {
      const display = document.getElementById('display');
      if (display.value === '0') display.value = val;
      else display.value += val;
    }
    function clearDisplay() {
      document.getElementById('display').value = '0';
    }
    function calculate() {
      try {
        document.getElementById('display').value = eval(document.getElementById('display').value);
      } catch(e) {
        document.getElementById('display').value = 'Error';
      }
    }
  </script>
</body>
</html>`,
      todolist: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 20px; font-family: Arial; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
    .container { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    h1 { margin: 0 0 20px 0; color: #333; }
    .input-group { display: flex; gap: 10px; margin-bottom: 20px; }
    input { flex: 1; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; }
    button { padding: 12px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; }
    button:hover { background: #764ba2; }
    .todo-item { display: flex; align-items: center; gap: 10px; padding: 12px; background: #f5f5f5; border-radius: 8px; margin-bottom: 10px; }
    .todo-item.completed { text-decoration: line-through; opacity: 0.6; }
    .delete-btn { background: #dc3545; padding: 8px 15px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📝 My Todo List</h1>
    <div class="input-group">
      <input type="text" id="todoInput" placeholder="What needs to be done?">
      <button onclick="addTodo()">Add</button>
    </div>
    <div id="todoList"></div>
  </div>
  <script>
    let todos = [];
    function addTodo() {
      const input = document.getElementById('todoInput');
      if (input.value.trim()) {
        todos.push({ text: input.value, completed: false });
        input.value = '';
        renderTodos();
      }
    }
    function toggleTodo(index) {
      todos[index].completed = !todos[index].completed;
      renderTodos();
    }
    function deleteTodo(index) {
      todos.splice(index, 1);
      renderTodos();
    }
    function renderTodos() {
      const list = document.getElementById('todoList');
      list.innerHTML = todos.map((todo, i) => 
        \`<div class="todo-item \${todo.completed ? 'completed' : ''}">
          <input type="checkbox" \${todo.completed ? 'checked' : ''} onchange="toggleTodo(\${i})">
          <span style="flex: 1">\${todo.text}</span>
          <button class="delete-btn" onclick="deleteTodo(\${i})">Delete</button>
        </div>\`
      ).join('');
    }
  </script>
</body>
</html>`
    };
    handleChange('html_content', templates[template]);
    toast.success('Template inserted!');
  };

  return (
    <>
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish to App Store?</DialogTitle>
            <DialogDescription>
              Would you like to publish this app to the App Store? This will make it available for all users to download.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => {
                setShowPublishDialog(false);
                handlePublishToStore();
              }}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
            >
              Yes, Publish
            </Button>
            <Button
              onClick={() => setShowPublishDialog(false)}
              variant="outline"
              className="flex-1"
            >
              No, Thanks
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Options</DialogTitle>
            <DialogDescription>
              Choose where to save your .eaf file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <Button
              onClick={downloadToDevice}
              className="w-full h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            >
              <Monitor className="w-6 h-6" />
              <div>
                <div className="font-semibold">Device Download</div>
                <div className="text-xs opacity-90">Save to your computer</div>
              </div>
            </Button>
            <Button
              onClick={downloadToEggetSystem}
              className="w-full h-20 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <HardDrive className="w-6 h-6" />
              <div>
                <div className="font-semibold">EggetSystem Download</div>
                <div className="text-xs opacity-90">Save to EggetSystem Files</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="h-full flex bg-gray-50">
      {/* Form Panel */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl border p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">EggetSystem App Creator</h2>
                  <p className="text-sm text-gray-500">Design and export custom apps with HTML, JavaScript, or React</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* App Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">App Name *</Label>
                    <Input
                      id="name"
                      value={appData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="My Awesome App"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="app_id">App ID *</Label>
                    <Input
                      id="app_id"
                      value={appData.app_id}
                      onChange={(e) => handleChange('app_id', e.target.value)}
                      placeholder="my_awesome_app"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="version">Version *</Label>
                    <Input
                      id="version"
                      value={appData.version}
                      onChange={(e) => handleChange('version', e.target.value)}
                      placeholder="1.0.0"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="license_name">License Holder *</Label>
                    <Input
                      id="license_name"
                      value={appData.license_name}
                      onChange={(e) => handleChange('license_name', e.target.value)}
                      placeholder="Company or creator name"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="icon">Icon</Label>
                    <Select value={appData.icon} onValueChange={(value) => handleChange('icon', value)}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {iconOptions.map((icon) => (
                          <SelectItem key={icon} value={icon}>{icon}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* VR Mode Toggle */}
                <div className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Glasses className="w-5 h-5 text-purple-600" />
                    <div>
                      <Label className="text-sm font-semibold text-purple-900">VR Mode</Label>
                      <p className="text-xs text-purple-700">Enable WebXR virtual reality support</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={appData.vr_enabled}
                      onChange={(e) => handleChange('vr_enabled', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {/* Language Selection */}
                <div>
                  <Label>Code Language</Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => {
                          handleChange('language', lang.id);
                          handleChange('html_content', getLanguageTemplate(lang.id));
                        }}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          appData.language === lang.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-semibold text-gray-800">{lang.name}</p>
                        <p className="text-xs text-gray-500">{lang.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* React ZIP Upload */}
                <div>
                  <Label>Upload a React app</Label>
                  <p className="text-xs text-gray-500 mb-2">Package a React project as a .zip and upload it instead of writing code below.</p>
                  <ReactZipUploader onExtracted={handleZipExtracted} />
                  {isZipApp && (
                    <div className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      ✓ React ZIP loaded ({appData.react_zip?.mode === 'prebuilt' ? 'pre-built bundle' : 'source — transpiled on open'}). Switch to the Preview tab to see it run.
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={appData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder="Describe what your app does..."
                    className="mt-1.5 h-20"
                  />
                </div>

                <div>
                  <Label htmlFor="color">Color Theme</Label>
                  <div className="grid grid-cols-10 gap-2 mt-3">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => handleChange('color', color.value)}
                        className={`h-10 rounded-lg bg-gradient-to-br ${color.value} transition-all ${
                          appData.color === color.value 
                            ? 'ring-4 ring-blue-500 ring-offset-2 scale-110' 
                            : 'hover:scale-110'
                        }`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                {/* EggSys API Reference */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Code className="w-4 h-4 text-blue-600" />
                    <h4 className="font-semibold text-blue-900 text-sm">EggSys API (built-in)</h4>
                  </div>
                  <p className="text-xs text-blue-800 mb-3">These methods are auto-injected into every app — no setup required.</p>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="bg-white/70 rounded px-2.5 py-1.5"><span className="text-blue-700">EggSys.closeApp()</span> <span className="text-gray-500">— close this app</span></div>
                    <div className="bg-white/70 rounded px-2.5 py-1.5"><span className="text-blue-700">EggSys.notify(title, message)</span> <span className="text-gray-500">— push a notification</span></div>
                    <div className="bg-white/70 rounded px-2.5 py-1.5"><span className="text-blue-700">EggSys.fullscn()</span> <span className="text-gray-500">— toggle fullscreen</span></div>
                    <div className="bg-white/70 rounded px-2.5 py-1.5"><span className="text-blue-700">EggSys.UserInfo()</span> <span className="text-gray-500">— get current user (async)</span></div>
                    <div className="bg-white/70 rounded px-2.5 py-1.5 ring-2 ring-blue-400"><span className="text-blue-700">EggSys.Email(subject, body)</span> <span className="text-gray-500">— email the current user (async)</span></div>
                    <div className="bg-white/70 rounded px-2.5 py-1.5"><span className="text-blue-700">EggSys.install(appName, appId)</span> <span className="text-gray-500">— prompt user to install another app (async)</span></div>
                  </div>
                  <p className="text-[11px] text-blue-700 mt-2">Async methods return a Promise. Email sends to the logged-in user's address. Install opens the App Store install sheet for the given app.</p>
                </div>

                {/* Code Editor */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>{appData.language === 'html' ? 'HTML' : appData.language === 'react' ? 'React JSX' : 'JavaScript'} Content</Label>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setShowSnippets(!showSnippets)}>
                        <Lightbulb className="w-4 h-4 mr-1" />
                        Snippets
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => insertTemplate('basic')}>Basic</Button>
                      <Button size="sm" variant="outline" onClick={() => insertTemplate('calculator')}>Calculator</Button>
                      <Button size="sm" variant="outline" onClick={() => insertTemplate('todolist')}>Todo</Button>
                      <Button size="sm" variant="outline" onClick={() => insertTemplate('weather')}>Weather</Button>
                      <Button size="sm" variant="outline" onClick={() => insertTemplate('notes')}>Notes</Button>
                      <Button size="sm" variant="outline" onClick={() => insertTemplate('quiz')}>Quiz</Button>
                      <Button size="sm" variant="outline" onClick={() => setIsFullscreen(!isFullscreen)}>
                        <Maximize2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {showSnippets && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                      <h4 className="font-semibold text-blue-900 mb-3 text-sm">Code Snippets</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {Object.keys(codeSnippets).map(key => (
                          <Button
                            key={key}
                            size="sm"
                            variant="outline"
                            onClick={() => insertSnippet(codeSnippets[key])}
                            className="capitalize"
                          >
                            {key}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isFullscreen ? (
                    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col">
                      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
                        <h3 className="text-white font-semibold">Fullscreen Editor</h3>
                        <Button size="sm" variant="ghost" onClick={() => setIsFullscreen(false)} className="text-white">
                          <Maximize2 className="w-4 h-4 mr-2" />
                          Exit Fullscreen
                        </Button>
                      </div>
                      <Textarea
                        value={appData.html_content}
                        onChange={(e) => handleChange('html_content', e.target.value)}
                        className="flex-1 font-mono text-sm bg-gray-900 text-white border-0 rounded-none resize-none"
                        placeholder="Enter your code here..."
                      />
                    </div>
                  ) : (
                    <Tabs value={previewMode} onValueChange={setPreviewMode}>
                      <TabsList className="mb-3">
                        <TabsTrigger value="code" className="flex items-center gap-2">
                          <Code className="w-4 h-4" /> Code
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="flex items-center gap-2">
                          <Eye className="w-4 h-4" /> Preview
                        </TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="code">
                        {isZipApp ? (
                          <div className="h-96 flex flex-col items-center justify-center text-center bg-gray-50 rounded-lg border border-dashed border-gray-300 p-6">
                            <FileCode className="w-10 h-10 text-blue-500 mb-3" />
                            <p className="font-semibold text-gray-700 text-sm">React ZIP app loaded</p>
                            <p className="text-xs text-gray-500 mt-1 max-w-xs">
                              This app runs from the uploaded source. Use the Preview tab to see it live, or upload a different ZIP to replace it.
                            </p>
                          </div>
                        ) : (
                          <Textarea
                            value={appData.html_content}
                            onChange={(e) => handleChange('html_content', e.target.value)}
                            className="font-mono text-sm h-96"
                            placeholder="Enter your HTML code here..."
                          />
                        )}
                      </TabsContent>
                      
                      <TabsContent value="preview">
                        <div className="border rounded-lg overflow-hidden bg-white" style={{ height: '384px' }}>
                          <iframe
                            srcDoc={getCompiledContent()}
                            className="w-full h-full"
                            sandbox="allow-scripts"
                            title="App Preview"
                          />
                        </div>
                      </TabsContent>
                    </Tabs>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex gap-2">
                    <Button onClick={importFromFile} variant="outline" size="sm" className="flex-1">
                      <Upload className="w-4 h-4 mr-2" />
                      Import
                    </Button>
                    <Button onClick={duplicateApp} variant="outline" size="sm" className="flex-1" disabled={!appData.name}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </Button>
                    <Button onClick={() => {
                      localStorage.setItem('app_creator_draft', JSON.stringify(appData));
                      toast.success('Draft saved');
                    }} variant="outline" size="sm" className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      Save Draft
                    </Button>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={installApp}
                      disabled={isInstalling}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {isInstalling ? 'Installing...' : 'Install App'}
                    </Button>
                    <Button
                      onClick={handleDownloadClick}
                      disabled={isInstalling}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download .eaf
                    </Button>
                  </div>
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    disabled={isInstalling}
                    className="w-full"
                  >
                    Reset Form
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="w-80 bg-white border-l p-6 flex flex-col overflow-auto">
        <h3 className="font-semibold text-gray-800 mb-4">Live Preview</h3>
        
        {/* Start Menu Preview */}
        <div className="bg-gray-900 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-400 mb-3">Start Menu</p>
          <div className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-white/5">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${appData.color} flex items-center justify-center shadow-lg`}>
              {React.createElement(ICON_MAP[appData.icon] || Package, { className: "w-7 h-7 text-white" })}
            </div>
            <span className="text-xs text-white text-center">
              {appData.name || 'App Name'}
            </span>
          </div>
        </div>

        {/* App Info Card */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-3">App Info</p>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${appData.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                {React.createElement(ICON_MAP[appData.icon] || Package, { className: "w-6 h-6 text-white" })}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-800 text-sm">
                  {appData.name || 'App Name'}
                </h4>
                <p className="text-xs text-gray-500">v{appData.version}</p>
                <p className="text-xs text-gray-600 mt-2">
                  {appData.description || 'No description'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}