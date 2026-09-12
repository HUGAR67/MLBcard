const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let batters=[],pitchers=[],pool=[],state=JSON.parse(localStorage.getItem("dd_state")||"null");
const teams=["ARI","ATL","BAL","BOS","CHC","CHW","CIN","CLE","COL","DET","HOU","KCR","LAA","LAD","MIA","MIL","MIN","NYM","NYY","OAK","PHI","PIT","SDP","SEA","SFG","STL","TBR","TEX","TOR","WSN"];
function num(x){let n=parseFloat(x);return isNaN(n)?0:n}
function rarity(p){let w=num(p.WAR??p.V); return w>=7?"LEGEND":w>=5?"DIAMOND":w>=3.5?"GOLD":w>=2?"SILVER":"BRONZE"}
function rating(p,type){if(type==="b")return Math.round(50+num(p.S)*.28+num(p.WAR)*3+num(p.Q)*28);return Math.round(95-num(p.FIP)*5+num(p.J)*1.2+num(p.WAR)*3)}
function save(){localStorage.setItem("dd_state",JSON.stringify(state));renderWallet()}
function toast(t){let e=$("#toast");e.textContent=t;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),1800)}
function makeId(p,t){return t+"_"+p.B+"_"+p.C}
function ownedCard(id){return state.owned[id]}
function cardHTML(p,t,compact=false){
 let id=makeId(p,t), own=ownedCard(id), r=rarity(p), rt=rating(p,t);
 return `<div class="card ${own?"owned":""}" data-id="${id}"><span class="rarity">${r}</span><div class="name">${p.B}</div><div class="meta">${p.C} · ${t==="b"?"打者":"投手"} · ${rt} OVR</div><div class="statrow">${t==="b"?`<div class="stat"><b>${p.N}</b><small>AVG</small></div><div class="stat"><b>${p.P}</b><small>SLG</small></div><div class="stat"><b>${p.W}</b><small>WAR</small></div>`:`<div class="stat"><b>${p.R}</b><small>ERA</small></div><div class="stat"><b>${p.J}</b><small>K/9</small></div><div class="stat"><b>${p.WAR||p.V}</b><small>WAR</small></div>`}</div></div>`
}
async function load(){
 try{batters=await (await fetch("batter.json")).json();pitchers=await (await fetch("pitcher.json")).json();batters=batters.filter(x=>x.B&&x.B!=="Name");pitchers=pitchers.filter(x=>x.B&&x.B!=="Name")}
 catch(e){toast("資料載入失敗，請確認 GitHub Pages 檔案位置");return}
 pool=[...batters.map(p=>({p,t:"b"})),...pitchers.map(p=>({p,t:"p"}))];
 if(!state){state={coins:1000,dust:0,owned:{},lineup:{batters:[],starters:[],relievers:[]},season:null,playoffs:null};seed()}
 renderAll()
}
function seed(){let picks=[...pool].sort((a,b)=>rating(b.p,b.t)-rating(a.p,a.t)).slice(0,3);picks.forEach(x=>state.owned[makeId(x.p,x.t)]=x)}
function renderWallet(){$("#coins").textContent=state.coins;$("#dust").textContent=state.dust}
function showTab(id){$$(".tab").forEach(x=>x.classList.toggle("active",x.id===id));$$("nav button").forEach(x=>x.classList.toggle("active",x.dataset.tab===id))}
$$("nav button").forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
function openPack(){
 if(state.coins<100)return toast("金幣不足！");
 state.coins-=100;let result=[];
 for(let i=0;i<5;i++){
  let r=Math.random(), weights=r<.02?"LEGEND":r<.08?"DIAMOND":r<.27?"GOLD":r<.65?"SILVER":"BRONZE";
  let cand=pool.filter(x=>rarity(x.p)===weights);if(!cand.length)cand=pool;
  result.push(cand[Math.floor(Math.random()*cand.length)]);
 }
 let box=$("#packResult");box.innerHTML=result.map(x=>cardHTML(x.p,x.t)).join("");
 result.forEach(x=>{let id=makeId(x.p,x.t);if(state.owned[id])state.dust+=10;else state.owned[id]=x});
 save();toast("開包完成！");
}
$("#openPack").onclick=openPack;
function ownedPool(){return pool.filter(x=>state.owned[makeId(x.p,x.t)])}
function toggleCard(x){
 let id=makeId(x.p,x.t), arr=x.t==="b"?state.lineup.batters:(num(x.p.SV)>0?"relievers":"starters");
 let i=arr.indexOf(id);if(i>=0){arr.splice(i,1);toast("已移除")}else{
  let limit=x.t==="b"?9:(num(x.p.SV)>0?3:5);
  if(arr.length>=limit)return toast("這個位置已滿");
  arr.push(id);toast("已加入陣容")
 } save();renderRoster()
}
function autoLineup(){
 let os=ownedPool();state.lineup.batters=os.filter(x=>x.t==="b").sort((a,b)=>rating(b.p,b.t)-rating(a.p,a.t)).slice(0,9).map(x=>makeId(x.p,x.t));
 let ps=os.filter(x=>x.t==="p");state.lineup.starters=ps.filter(x=>num(x.p.GS)>0).sort((a,b)=>rating(b.p,b.t)-rating(a.p,a.t)).slice(0,5).map(x=>makeId(x.p,x.t));
 state.lineup.relievers=ps.filter(x=>num(x.p.SV)>0).sort((a,b)=>rating(b.p,b.t)-rating(a.p,a.t)).slice(0,3).map(x=>makeId(x.p,x.t));
 save();renderRoster();toast("已排入最佳陣容")
}
function getById(id){let t=id.startsWith("b_")?"b":"p";return pool.find(x=>makeId(x.p,x.t)===id)}
function renderRoster(){
 let b=state.lineup.batters.map(getById).filter(Boolean),s=state.lineup.starters.map(getById).filter(Boolean),r=state.lineup.relievers.map(getById).filter(Boolean);
 let all=[...b,...s,...r];let off=b.length?Math.round(b.reduce((a,x)=>a+rating(x.p,x.t),0)/b.length):0,pit=all.filter(x=>x.t==="p").length?Math.round(all.filter(x=>x.t==="p").reduce((a,x)=>a+rating(x.p,x.t),0)/all.filter(x=>x.t==="p").length):0;
 $("#teamRating").textContent=all.length?Math.round((off+pit)/2):"--";$("#offRating").textContent=off||"--";$("#pitRating").textContent=pit||"--";
 $("#lineup").innerHTML=Array.from({length:9},(_,i)=>{let x=b[i];return `<div class="slot">打線 ${i+1}${x?`<b>${x.p.B}</b><span>${rating(x.p,"b")} OVR</span>`:"<span>空缺</span>"}</div>`}).join("");
 $("#ownedGrid").innerHTML=ownedPool().map(x=>cardHTML(x.p,x.t)).join("");
 $$("#ownedGrid .card").forEach((el,i)=>el.onclick=()=>toggleCard(ownedPool()[i]));
}
function teamStrength(){
 let b=state.lineup.batters.map(getById).filter(Boolean),p=[...state.lineup.starters,...state.lineup.relievers].map(getById).filter(Boolean);
 let off=b.length?b.reduce((a,x)=>a+rating(x.p,"b"),0)/b.length:55;
 let pit=p.length?p.reduce((a,x)=>a+rating(x.p,"p"),0)/p.length:55;
 return {off,pit,overall:(off+pit)/2}
}
function seasonTeamRating(team){
 let bs=batters.filter(x=>x.C===team).sort((a,b)=>num(b.W)-num(a.W)).slice(0,9),ps=pitchers.filter(x=>x.C===team).sort((a,b)=>num(b.V)-num(a.V)).slice(0,5);
 return {off:bs.length?bs.reduce((a,x)=>a+rating(x,"b"),0)/bs.length:60,pit:ps.length?ps.reduce((a,x)=>a+rating(x,"p"),0)/ps.length:60}
}
function normal(mu,sd){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return mu+sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function gameWin(a,b){let pa=a.overall||60,pb=b.overall||60;return Math.random()<1/(1+Math.exp(-(pa-pb)/7))}
function simulateSeason(){
 let my=teamStrength(), records=teams.map(t=>({team:t,w:0,l:0,rating:(seasonTeamRating(t).off+seasonTeamRating(t).pit)/2}));records.push({team:"YOU",w:0,l:0,rating:my.overall});
 for(let i=0;i<162;i++){let opp=teams[Math.floor(Math.random()*teams.length)];let or=records.find(x=>x.team===opp);if(gameWin(my,{overall:or.rating})){records.at(-1).w++;or.l++;state.coins+=25}else{records.at(-1).l++;or.w++}}
 records.sort((a,b)=>b.w-a.w);state.season={records,champion:null};state.playoffs=null;save();renderSeason();showTab("season");toast("162 場例行賽完成！")
}
function renderSeason(){
 if(!state.season){$("#seasonSummary").innerHTML="<h2>還沒開始</h2><p>先按「模擬完整賽季」。</p>";$("#standings").innerHTML="";return}
 let me=state.season.records.find(x=>x.team==="YOU"),rank=state.season.records.findIndex(x=>x.team==="YOU")+1;
 $("#seasonSummary").innerHTML=`<h2>你的戰績：${me.w}-${me.l}</h2><p>聯盟排名第 ${rank}。${rank<=12?"恭喜，你進入季後賽！":"這次無緣季後賽，重新抽卡強化吧。"}</p>`;
 $("#standings").innerHTML="<h2>聯盟戰績</h2>"+state.season.records.map((x,i)=>`<div style="display:flex;justify-content:space-between;padding:9px;border-bottom:1px solid #202b36"><span>${i+1}. <b>${x.team==="YOU"?"⭐ 你的球隊":x.team}</b></span><span>${x.w}-${x.l}　OVR ${Math.round(x.rating)}</span></div>`).join("");
}
function playoffGame(a,b,round,log){
 let ar=a.rating,br=b.rating,w=gameWin({overall:ar},{overall:br})?a:b;
 log.push(`${round}：${a.team} ${w===a?"勝":"負"} ${b.team} → <b>${w.team}</b> 晉級`);
 return w
}
function simulatePlayoffs(){
 if(!state.season)return toast("請先完成例行賽");
 let sorted=state.season.records.slice(0,12), me=sorted.find(x=>x.team==="YOU");if(!me)return;
 let log=[],rounds=[];
 let seeds=sorted.map(x=>({...x}));
 // Play-in / wild card to 8
 let current=[...seeds.slice(0,4),...seeds.slice(4,12)];
 let wc=[]; for(let i=4;i<12;i+=2)wc.push(playoffGame(current[i],current[i+1],"Wild Card",log));
 let q=[...seeds.slice(0,4),...wc].sort((a,b)=>seeds.indexOf(a)-seeds.indexOf(b));
 let ds=[];for(let i=0;i<4;i+=2)ds.push(playoffGame(q[i],q[7-i],"Division",log));
 let cs=[];cs.push(playoffGame(ds[0],ds[1],"Championship",log));
 let champ=cs[0];state.playoffs={champion:champ.team,log};save();renderPlayoffs();showTab("playoffs");toast(champ.team==="YOU"?"🏆 世界大賽冠軍！":"季後賽結束")
}
function renderPlayoffs(){
 if(!state.playoffs){$("#bracket").innerHTML="";$("#playoffLog").innerHTML="<h2>季後賽尚未開始</h2>";return}
 $("#bracket").innerHTML=`<div class="round"><h3>Play-in</h3><div class="match">12 隊爭奪晉級</div></div><div class="round"><h3>Division</h3><div class="match">勝者進入聯盟冠軍戰</div></div><div class="round"><h3>Championship</h3><div class="match win">${state.playoffs.champion} 🏆</div></div><div class="round"><h3>World Series</h3><div class="match win">${state.playoffs.champion==="YOU"?"⭐ YOU — CHAMPIONS!":"尚未實作跨聯盟對戰"}</div></div>`;
 $("#playoffLog").innerHTML="<h2>季後賽紀錄</h2>"+state.playoffs.log.map(x=>`<p>${x}</p>`).join("")
}
let activeFilter="all";
function renderCollection(){
 let q=($("#search").value||"").toLowerCase();
 let arr=pool.filter(x=>(activeFilter==="all"||activeFilter==="batter"&&x.t==="b"||activeFilter==="pitcher"&&x.t==="p"||activeFilter==="owned"&&ownedCard(makeId(x.p,x.t))) && (`${x.p.B} ${x.p.C}`.toLowerCase().includes(q))).slice(0,180);
 $("#collectionGrid").innerHTML=arr.map(x=>cardHTML(x.p,x.t)).join("");
}
$("#search").oninput=renderCollection;
$$(".filter").forEach(b=>b.onclick=()=>{$$(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");activeFilter=b.dataset.filter;renderCollection()});
$("#simSeason").onclick=simulateSeason;$("#simPlayoffs").onclick=simulatePlayoffs;
function renderAll(){renderWallet();renderRoster();renderSeason();renderPlayoffs();renderCollection()}
load();
