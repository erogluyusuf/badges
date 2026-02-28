<script setup lang="ts">
import { ref, computed, type CSSProperties } from 'vue';
import html2canvas from 'html2canvas';

// Types
interface GithubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  license: { spdx_id: string } | null;
  default_branch?: string;
}

const username = ref('');
const repos = ref<GithubRepo[]>([]);
const selectedRepo = ref<GithubRepo | null>(null);
const selectedRepoIndex = ref<number | ''>('');
const loading = ref(false);
const downloading = ref(false);
const copied = ref(false);

const avatarUrl = ref('');
const imageSource = ref('opengraph');
const customImageUrl = ref('');

const repoImages = ref<{path: string, url: string}[]>([]);
const loadingImages = ref(false);
const selectedRepoImage = ref('');

const cardRef = ref<HTMLElement | null>(null);

const imgFit = ref<'cover' | 'contain' | 'fill' | 'none' | 'scale-down'>('cover');
const imgScale = ref(1);
const imgPosX = ref(50);
const imgPosY = ref(50);

const resetImageSettings = () => {
  imgFit.value = 'cover';
  imgScale.value = 1;
  imgPosX.value = 50;
  imgPosY.value = 50;
};

// CUSTOM BADGE STATE
const customBadgeLabel = ref('');
const customBadgeMessage = ref('');
const customBadgeColor = ref('#3b82f6'); 
const customBadgeLogo = ref('');
const customBadgesList = ref<{id: number, url: string, label: string}[]>([]);

const config = ref({
  title: '',
  description: '',
  showLang: true,
  showStars: true,
  showForks: false,
  showIssues: false,
  showLicense: true,
  showPRsWelcome: false,
  showMaintained: false,
  showWIP: false,
  showLastCommit: false,
  showRepoSize: false,
  showQRCode: true,
  cardBg: '#ffffff',
  cardText: '#1f2937',
  imageBg: '#f3f4f6',
  cardWidth: 450,
  cardPadding: 24
});

const resetColors = () => {
  config.value.cardBg = '#ffffff';
  config.value.cardText = '#1f2937';
  config.value.imageBg = '#f3f4f6';
};

const resetSizes = () => {
  config.value.cardWidth = 450;
  config.value.cardPadding = 24;
};

const getRepos = async () => {
  if (!username.value) return;
  loading.value = true;
  selectedRepo.value = null;
  selectedRepoIndex.value = '';
  customBadgesList.value = [];
  try {
    const res = await fetch(`https://api.github.com/users/${username.value}/repos?sort=updated&per_page=100`);
    const data = await res.json();
    if (Array.isArray(data)) repos.value = data;

    const userRes = await fetch(`https://api.github.com/users/${username.value}`);
    const userData = await userRes.json();
    avatarUrl.value = userData.avatar_url;
  } catch (err) {
    alert("API Error! Could not fetch data.");
  } finally {
    loading.value = false;
  }
};

const selectRepo = async (repo: GithubRepo) => {
  selectedRepo.value = repo;
  config.value.title = repo.name;
  config.value.description = repo.description || 'Project description will appear here...';
  imageSource.value = 'opengraph';
  customImageUrl.value = '';
  selectedRepoImage.value = '';
  customBadgesList.value = [];
  resetImageSettings();
  resetSizes();
  
  await fetchRepoImages(repo);
};

const fetchRepoImages = async (repo: GithubRepo) => {
  loadingImages.value = true;
  repoImages.value = [];
  try {
    const branch = repo.default_branch || 'main';
    const res = await fetch(`https://api.github.com/repos/${username.value}/${repo.name}/git/trees/${branch}?recursive=1`);
    const data = await res.json();
    
    if (data && data.tree) {
      const images = data.tree.filter((file: any) => 
        file.type === 'blob' && /\.(png|jpe?g|gif|svg)$/i.test(file.path)
      );
      repoImages.value = images.map((img: any) => ({
        path: img.path,
        url: `https://raw.githubusercontent.com/${username.value}/${repo.name}/${branch}/${img.path}`
      }));
      if (repoImages.value.length > 0) {
        selectedRepoImage.value = repoImages.value[0].url;
      }
    }
  } catch (e) {
    console.error("Failed to fetch repository images:", e);
  } finally {
    loadingImages.value = false;
  }
};

const handleRepoSelect = () => {
  if (selectedRepoIndex.value !== '') {
    const repo = repos.value[selectedRepoIndex.value as number];
    if (repo) {
      selectRepo(repo);
    }
  }
};

// Extracted image styling logic with strict CSSProperties typing
const coverImageStyle = computed<CSSProperties>(() => ({
  width: `${imgScale.value * 100}%`,
  height: `${imgScale.value * 100}%`,
  maxWidth: 'none',
  objectFit: imgFit.value,
  objectPosition: `${imgPosX.value}% ${imgPosY.value}%`
}));

const finalImageUrl = computed(() => {
  const repo = selectedRepo.value;
  if (imageSource.value === 'opengraph' && repo) return `https://opengraph.githubassets.com/1/${username.value}/${repo.name}`;
  if (imageSource.value === 'avatar') return avatarUrl.value;
  if (imageSource.value === 'repo') return selectedRepoImage.value || 'https://via.placeholder.com/400x200?text=No+Image+Found';
  return customImageUrl.value || 'https://via.placeholder.com/400x200?text=Enter+URL';
});

const qrCodeUrl = computed(() => {
  const repo = selectedRepo.value;
  if (!repo) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(repo.html_url)}&margin=0`;
});

const addCustomBadge = () => {
  if (!customBadgeLabel.value || !customBadgeMessage.value) return;
  const label = encodeURIComponent(customBadgeLabel.value);
  const message = encodeURIComponent(customBadgeMessage.value);
  const color = customBadgeColor.value.replace('#', '');
  let url = `https://img.shields.io/badge/${label}-${message}-${color}?style=flat-square`;
  if (customBadgeLogo.value) url += `&logo=${encodeURIComponent(customBadgeLogo.value)}&logoColor=white`;
  customBadgesList.value.push({ id: Date.now(), url, label: customBadgeLabel.value });
  customBadgeLabel.value = ''; customBadgeMessage.value = ''; customBadgeLogo.value = '';
};

const removeCustomBadge = (id: number) => {
  customBadgesList.value = customBadgesList.value.filter(b => b.id !== id);
};

const activeBadges = computed(() => {
  const r = selectedRepo.value;
  if (!r) return [];
  const u = username.value;
  let badges: string[] = [];
  if (config.value.showPRsWelcome) badges.push(`https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square&logo=github`);
  if (config.value.showMaintained) badges.push(`https://img.shields.io/badge/Maintained%3F-yes-green?style=flat-square`);
  if (config.value.showWIP) badges.push(`https://img.shields.io/badge/Status-WIP-orange?style=flat-square`);
  if (config.value.showLang && r.language) badges.push(`https://img.shields.io/badge/Language-${r.language}-blue?style=flat-square&logo=${r.language.toLowerCase()}&logoColor=white`);
  if (config.value.showStars) badges.push(`https://img.shields.io/github/stars/${u}/${r.name}?style=flat-square&color=yellow`);
  if (config.value.showForks) badges.push(`https://img.shields.io/github/forks/${u}/${r.name}?style=flat-square&color=gray`);
  if (config.value.showIssues) badges.push(`https://img.shields.io/github/issues/${u}/${r.name}?style=flat-square&color=red`);
  if (config.value.showLicense && r.license) badges.push(`https://img.shields.io/github/license/${u}/${r.name}?style=flat-square&color=green`);
  if (config.value.showLastCommit) badges.push(`https://img.shields.io/github/last-commit/${u}/${r.name}?style=flat-square&color=blueviolet`);
  if (config.value.showRepoSize) badges.push(`https://img.shields.io/github/repo-size/${u}/${r.name}?style=flat-square&color=blue`);
  customBadgesList.value.forEach(b => badges.push(b.url));
  return badges;
});

const outputCode = computed(() => {
  const repo = selectedRepo.value;
  if (!repo) return '';
  return `\n<div align="center">\n  <a href="${repo.html_url}">\n    <img src="./${repo.name}-card.png" alt="${repo.name} Card" width="${config.value.cardWidth}">\n  </a>\n</div>`;
});

const copy = () => {
  navigator.clipboard.writeText(outputCode.value);
  copied.value = true;
  setTimeout(() => copied.value = false, 2000);
};

const downloadImage = async () => {
  if (!cardRef.value || !selectedRepo.value) return;
  downloading.value = true;
  try {
    const canvas = await html2canvas(cardRef.value, { scale: 2, useCORS: true, backgroundColor: null });
    const link = document.createElement('a');
    link.download = `${selectedRepo.value.name}-card.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    alert("Download failed.");
  } finally {
    downloading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-neutral-950 text-neutral-200 font-sans p-4 md:p-8">
    <div class="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      <div class="lg:col-span-5 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col gap-6 max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl">
        
        <div>
          <h2 class="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-3">1. Select Project</h2>
          <div class="flex gap-2 mb-3">
            <input v-model="username" @keyup.enter="getRepos" placeholder="GitHub Username" class="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 outline-none focus:border-blue-500 text-sm" />
            <button @click="getRepos" class="bg-blue-600 px-4 rounded-xl font-bold text-sm hover:bg-blue-500 transition-all">Fetch</button>
          </div>
          
          <select v-if="repos.length > 0" v-model="selectedRepoIndex" @change="handleRepoSelect" class="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 outline-none focus:border-blue-500 text-sm cursor-pointer appearance-none">
            <option value="" disabled>Select a repository...</option>
            <option v-for="(repo, index) in repos" :key="repo.id" :value="index">{{ repo.name }}</option>
          </select>
        </div>

        <hr class="border-neutral-800">

        <div v-if="selectedRepo" class="space-y-4">
          <h2 class="text-sm font-bold text-neutral-500 uppercase tracking-widest">2. Customize Card</h2>
          
          <div class="bg-neutral-950/50 p-3 rounded-xl border border-neutral-800">
            <label class="block text-xs text-neutral-400 mb-2 font-bold">Cover Image</label>
            <div class="flex bg-neutral-950 rounded-lg p-1 border border-neutral-800 mb-3 overflow-x-auto custom-scrollbar">
              <button @click="imageSource = 'opengraph'" :class="imageSource === 'opengraph' ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:text-white'" class="flex-1 min-w-[70px] text-[10px] py-2 rounded font-bold transition-all">Card</button>
              <button @click="imageSource = 'avatar'" :class="imageSource === 'avatar' ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:text-white'" class="flex-1 min-w-[70px] text-[10px] py-2 rounded font-bold transition-all">Profile</button>
              <button @click="imageSource = 'repo'" :class="imageSource === 'repo' ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:text-white'" class="flex-1 min-w-[70px] text-[10px] py-2 rounded font-bold transition-all relative">Browse</button>
              <button @click="imageSource = 'custom'" :class="imageSource === 'custom' ? 'bg-blue-600 text-white' : 'text-neutral-500 hover:text-white'" class="flex-1 min-w-[70px] text-[10px] py-2 rounded font-bold transition-all">Link</button>
            </div>
            
            <div v-if="imageSource === 'repo'" class="animate-fade-in bg-neutral-900 border border-neutral-800 rounded-lg p-3 mb-3">
              <div v-if="loadingImages" class="text-center py-4 text-xs text-blue-400 animate-pulse">Scanning repository...</div>
              <div v-else class="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                <div v-for="img in repoImages" :key="img.path" @click="selectedRepoImage = img.url; resetImageSettings()"
                     :class="['relative rounded-md cursor-pointer border-2 h-16 bg-neutral-800', selectedRepoImage === img.url ? 'border-blue-500 scale-105 shadow-lg' : 'border-transparent hover:border-neutral-500']">
                  <img :src="img.url" class="w-full h-full object-cover opacity-80" />
                </div>
              </div>
            </div>

            <div v-if="imageSource === 'custom'" class="animate-fade-in mb-3">
              <input v-model="customImageUrl" type="text" placeholder="Paste image URL (https://...)" class="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500" />
            </div>

            <div class="mt-4 pt-3 border-t border-neutral-800 space-y-3">
              <div class="flex justify-between items-center text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                <span>Image Adjustments</span>
                <button @click="resetImageSettings" class="text-blue-500">Reset</button>
              </div>
              <div class="flex gap-2">
                <button @click="imgFit = 'cover'" :class="imgFit === 'cover' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'" class="flex-1 text-[10px] py-1.5 rounded font-bold">Cover</button>
                <button @click="imgFit = 'contain'" :class="imgFit === 'contain' ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-neutral-400'" class="flex-1 text-[10px] py-1.5 rounded font-bold">Contain</button>
              </div>
              <div>
                <div class="flex justify-between text-[10px] text-neutral-400 mb-1"><span>Zoom</span><span>{{ imgScale.toFixed(1) }}x</span></div>
                <input type="range" v-model.number="imgScale" min="0.5" max="4" step="0.1" class="w-full accent-blue-500">
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <div class="flex justify-between text-[10px] text-neutral-400 mb-1"><span>Pan X</span></div>
                  <input type="range" v-model.number="imgPosX" min="0" max="100" class="w-full accent-blue-500">
                </div>
                <div>
                  <div class="flex justify-between text-[10px] text-neutral-400 mb-1"><span>Pan Y</span></div>
                  <input type="range" v-model.number="imgPosY" min="0" max="100" class="w-full accent-blue-500">
                </div>
              </div>
            </div>
          </div>

          <div class="bg-neutral-950/50 p-4 rounded-xl border border-blue-900 space-y-3 shadow-lg shadow-blue-950/20 relative overflow-hidden">
            <div class="flex justify-between items-center relative z-10">
              <span class="text-xs font-bold text-blue-400 uppercase tracking-widest">✨ Add Custom Badge</span>
            </div>
            <div class="grid grid-cols-2 gap-3 relative z-10 mb-2">
              <input v-model="customBadgeLabel" type="text" placeholder="Label (e.g. Stack)" class="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500" />
              <input v-model="customBadgeMessage" type="text" placeholder="Message (e.g. Vue 3)" class="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500" />
            </div>
            <div class="flex items-center gap-2 relative z-10">
              <input v-model="customBadgeLogo" type="text" placeholder="Icon (e.g. vuedotjs)" class="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500" />
              <div class="flex items-center bg-neutral-900 rounded-lg px-2 h-[34px] border border-neutral-700 shrink-0">
                 <input type="color" v-model="customBadgeColor" class="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0">
              </div>
              <button @click="addCustomBadge" class="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 h-[34px] rounded-lg transition-all shadow-lg active:scale-95">Add</button>
            </div>
            <div v-if="customBadgesList.length > 0" class="mt-3 pt-3 border-t border-neutral-800 space-y-2 relative z-10 max-h-32 overflow-y-auto custom-scrollbar pr-1">
              <div v-for="badge in customBadgesList" :key="badge.id" class="flex justify-between items-center bg-black/30 p-2 rounded-lg border border-neutral-800">
                <img :src="badge.url" class="h-5" />
                <button @click="removeCustomBadge(badge.id)" class="text-red-500 hover:text-red-400 text-xs font-bold">Del</button>
              </div>
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-neutral-800 space-y-3">
            <div class="flex justify-between items-center mb-2">
              <span class="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Dimensions</span>
              <button @click="resetSizes" class="text-[10px] text-blue-500 font-bold">Reset</button>
            </div>
            <div>
              <div class="flex justify-between text-[10px] text-neutral-400 mb-1"><span>Card Width</span><span>{{ config.cardWidth }}px</span></div>
              <input type="range" v-model.number="config.cardWidth" min="350" max="800" step="10" class="w-full accent-blue-500">
            </div>
            <div>
              <div class="flex justify-between text-[10px] text-neutral-400 mb-1"><span>Inner Padding</span><span>{{ config.cardPadding }}px</span></div>
              <input type="range" v-model.number="config.cardPadding" min="10" max="60" step="2" class="w-full accent-blue-500">
            </div>
          </div>

          <div class="mt-4 pt-3 border-t border-neutral-800 space-y-3">
            <div class="flex justify-between items-center mb-2 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
              <span>Color Palette</span>
              <button @click="resetColors" class="text-blue-500">Reset</button>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <div class="flex flex-col gap-1 text-center text-[9px] text-neutral-400">
                <label>Background</label>
                <input type="color" v-model="config.cardBg" class="w-full h-8 rounded cursor-pointer border-0 bg-transparent p-0">
              </div>
              <div class="flex flex-col gap-1 text-center text-[9px] text-neutral-400">
                <label>Text</label>
                <input type="color" v-model="config.cardText" class="w-full h-8 rounded cursor-pointer border-0 bg-transparent p-0">
              </div>
              <div class="flex flex-col gap-1 text-center text-[9px] text-neutral-400">
                <label>Image Canvas</label>
                <input type="color" v-model="config.imageBg" class="w-full h-8 rounded cursor-pointer border-0 bg-transparent p-0">
              </div>
            </div>
          </div>

          <div>
            <label class="block text-xs text-neutral-400 mb-1 font-bold">Title</label>
            <input v-model="config.title" type="text" class="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-xs text-neutral-400 mb-1 font-bold">Description</label>
            <textarea v-model="config.description" rows="2" class="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500"></textarea>
          </div>

          <div>
            <label class="block text-xs text-neutral-400 mb-2 font-bold uppercase tracking-tighter">Display Statistics</label>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px]">
              <label class="flex items-center gap-2 cursor-pointer p-2 bg-neutral-950 rounded border border-neutral-800 hover:border-blue-500 transition-colors">
                <input type="checkbox" v-model="config.showPRsWelcome" class="accent-blue-500"> PRs Welcome
              </label>
              <label class="flex items-center gap-2 cursor-pointer p-2 bg-neutral-950 rounded border border-neutral-800 hover:border-blue-500 transition-colors">
                <input type="checkbox" v-model="config.showMaintained" class="accent-blue-500"> Maintained
              </label>
              <label class="flex items-center gap-2 cursor-pointer p-2 bg-neutral-950 rounded border border-neutral-800 hover:border-blue-500 transition-colors">
                <input type="checkbox" v-model="config.showWIP" class="accent-blue-500"> In Progress
              </label>
              <label class="flex items-center gap-2 cursor-pointer p-2 bg-neutral-950 rounded border border-neutral-800 hover:border-blue-500 transition-colors">
                <input type="checkbox" v-model="config.showLang" class="accent-blue-500"> Language
              </label>
              <label class="flex items-center gap-2 cursor-pointer p-2 bg-neutral-950 rounded border border-neutral-800 hover:border-blue-500 transition-colors">
                <input type="checkbox" v-model="config.showStars" class="accent-blue-500"> Stars
              </label>
              <label class="flex items-center gap-2 cursor-pointer p-2 bg-neutral-950 rounded border border-neutral-800 hover:border-blue-500 transition-colors">
                <input type="checkbox" v-model="config.showForks" class="accent-blue-500"> Forks
              </label>
              <label class="flex items-center gap-2 cursor-pointer p-2 bg-neutral-950 rounded border border-neutral-800 hover:border-blue-500 transition-colors">
                <input type="checkbox" v-model="config.showIssues" class="accent-blue-500"> Issues
              </label>
              <label class="flex items-center gap-2 cursor-pointer p-2 bg-neutral-950 rounded border border-neutral-800 hover:border-blue-500 transition-colors">
                <input type="checkbox" v-model="config.showLicense" class="accent-blue-500"> License
              </label>
              <label class="flex items-center gap-2 cursor-pointer p-2 bg-neutral-950 rounded border border-neutral-800 hover:border-blue-500 transition-colors">
                <input type="checkbox" v-model="config.showRepoSize" class="accent-blue-500"> Size
              </label>
              <label class="flex items-center gap-2 cursor-pointer p-2 bg-neutral-950 rounded border border-neutral-800 hover:border-blue-500 transition-colors">
                <input type="checkbox" v-model="config.showLastCommit" class="accent-blue-500"> Last Update
              </label>
              <label class="flex items-center gap-2 cursor-pointer p-2 bg-blue-900/20 rounded border border-blue-800 hover:border-blue-500 transition-colors md:col-span-2">
                <input type="checkbox" v-model="config.showQRCode" class="accent-blue-500"> <span class="font-bold text-blue-400">Embed QR Code</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-7 flex flex-col gap-6">
        <div class="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex-1 flex flex-col items-center justify-center relative shadow-xl overflow-hidden custom-scrollbar">
          <div class="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
            <h2 class="text-sm font-bold text-neutral-500 uppercase tracking-widest">Live Preview</h2>
            <button v-if="selectedRepo" @click="downloadImage" :disabled="downloading" class="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg active:scale-95 disabled:opacity-50">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              {{ downloading ? 'Processing...' : 'Download as PNG' }}
            </button>
          </div>
          
          <div v-if="selectedRepo" class="mt-14 w-full overflow-x-auto flex items-start justify-center p-4">
            <div ref="cardRef" :style="{ backgroundColor: config.cardBg, width: `${config.cardWidth}px`, padding: `${config.cardPadding}px` }" class="rounded-2xl shadow-2xl text-center relative z-10 border border-black/5 flex-shrink-0 flex flex-col transition-all">
              <div :style="{ backgroundColor: config.imageBg }" class="p-0 rounded-xl mb-5 border border-black/5 flex items-center justify-center overflow-hidden h-48 relative">
                <img :src="finalImageUrl" class="transition-all duration-75 rounded-xl" :style="coverImageStyle" alt="Cover" crossorigin="anonymous" />
              </div>
              <h3 :style="{ color: config.cardText }" class="text-2xl font-extrabold mb-2 tracking-tight">{{ config.title }}</h3>
              <p :style="{ color: config.cardText, opacity: 0.8 }" class="text-sm mb-5 leading-relaxed px-2 flex-1">{{ config.description }}</p>
              <div class="flex items-end justify-between mt-auto">
                <div class="flex flex-wrap justify-center gap-1.5 pb-2 flex-1">
                  <img v-for="badge in activeBadges" :key="badge" :src="badge" class="h-6" crossorigin="anonymous" />
                </div>
                <div v-if="config.showQRCode" class="ml-4 shrink-0 bg-white p-1.5 rounded-xl shadow-sm border border-neutral-200 flex items-center justify-center">
                  <img :src="qrCodeUrl" class="w-14 h-14" alt="QR Code" crossorigin="anonymous" />
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-neutral-600 italic mt-10">Select a project to begin...</div>
        </div>

        <div v-if="selectedRepo" class="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 relative">
          <div class="flex justify-between items-center mb-3 text-sm font-bold text-neutral-500 uppercase tracking-widest">
            <h2>README Embed Code</h2>
            <button @click="copy" class="text-xs text-blue-500 bg-blue-500/10 px-3 py-1 rounded hover:bg-blue-500/20">{{ copied ? 'COPIED!' : 'COPY' }}</button>
          </div>
          <pre class="bg-neutral-950 p-4 rounded-lg text-xs text-blue-400 font-mono overflow-x-auto border border-neutral-800">{{ outputCode }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #262626; border-radius: 10px; }
.animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
</style>