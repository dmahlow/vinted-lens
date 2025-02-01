(()=>{"use strict";class t{constructor(){this.apiKeyInput=document.getElementById("apiKey"),this.imageDetailSelect=document.getElementById("imageDetail"),this.costLimitInput=document.getElementById("costLimit"),this.defaultPreferencesInput=document.getElementById("defaultPreferences"),this.endlessScrollInput=document.getElementById("endlessScroll"),this.usageStatsElement=document.getElementById("usageStats"),this.saveButton=document.getElementById("save"),this.statusElement=document.getElementById("status"),this.initialize()}async initialize(){const t=await browser.storage.local.get(["apiKey","imageDetail","costLimit","monthlyUsage","preferences","endlessScroll"]);this.apiKeyInput.value=t.apiKey||"",this.imageDetailSelect.value=t.imageDetail||"auto",this.costLimitInput.value=t.costLimit?.toString()||"",this.defaultPreferencesInput.value=(t.preferences||[]).join(", "),this.endlessScrollInput.checked=t.endlessScroll||!1,await this.updateUsageStats(t.monthlyUsage),this.saveButton.addEventListener("click",(()=>this.saveOptions()))}async updateUsageStats(t){if(!t)return void(this.usageStatsElement.innerHTML="No usage data available");const e=new Date(t.lastReset).toLocaleDateString();this.usageStatsElement.innerHTML=`\n      <ul>\n        <li>Monthly Tokens: ${t.monthlyTokens.toLocaleString()}</li>\n        <li>Images Analyzed: ${t.monthlyImages.toLocaleString()}</li>\n        <li>Estimated Cost: $${t.estimatedCost.toFixed(2)}</li>\n        <li>Last Reset: ${e}</li>\n      </ul>\n    `}async saveOptions(){const t=this.apiKeyInput.value.trim(),e=this.imageDetailSelect.value,s=parseFloat(this.costLimitInput.value);if(t)try{if(console.log("🔑 Raw API key:",t),console.log("🔑 API key details:",{length:t.length,startsWith:t.substring(0,7),includes_bearer:t.toLowerCase().includes("bearer"),trimmed_length:t.trim().length}),!t.startsWith("sk-")&&!t.startsWith("sk-proj-"))return void this.showStatus('API key must start with "sk-" or "sk-proj-"',"error");if(isNaN(s)||s<0)return void this.showStatus("Cost limit must be a positive number","error");const i=this.defaultPreferencesInput.value.split(",").map((t=>t.trim())).filter((t=>t));await browser.storage.local.set({apiKey:t,imageDetail:e,costLimit:s,preferences:i,endlessScroll:this.endlessScrollInput.checked}),await browser.runtime.reload(),this.showStatus("Settings saved","success")}catch(t){console.error("Failed to save options:",t),this.showStatus("Failed to save options","error")}else this.showStatus("API key is required","error")}showStatus(t,e="success"){this.statusElement.textContent=t,this.statusElement.className=e,setTimeout((()=>{this.statusElement.textContent="",this.statusElement.className=""}),3e3)}}document.addEventListener("DOMContentLoaded",(()=>{new t}))})();
//# sourceMappingURL=options.js.map