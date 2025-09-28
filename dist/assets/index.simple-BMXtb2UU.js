(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))n(t);new MutationObserver(t=>{for(const s of t)if(s.type==="childList")for(const i of s.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&n(i)}).observe(document,{childList:!0,subtree:!0});function o(t){const s={};return t.integrity&&(s.integrity=t.integrity),t.referrerPolicy&&(s.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?s.credentials="include":t.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(t){if(t.ep)return;t.ep=!0;const s=o(t);fetch(t.href,s)}})();console.log("Simple app starting...");class d{constructor(){this.currentView="search",this.init()}init(){console.log("Initializing navigation..."),this.setupNavigation(),this.setupThemeToggle(),this.setupFormInteractions(),this.showView("search")}setupNavigation(){const e=document.querySelectorAll(".nav-btn"),o=document.querySelectorAll(".app-view");console.log("Found nav buttons:",e.length),console.log("Found views:",o.length),e.forEach(n=>{n.addEventListener("click",()=>{const t=n.getAttribute("data-view");console.log("Navigation clicked:",t),this.showView(t)})})}showView(e){console.log("Showing view:",e),document.querySelectorAll(".app-view").forEach(s=>{s.classList.remove("active")});const n=document.querySelector(`[data-view="${e}"]`);n?(n.classList.add("active"),console.log("View activated:",e)):console.error("View not found:",e),document.querySelectorAll(".nav-btn").forEach(s=>{s.classList.remove("active"),s.getAttribute("data-view")===e&&s.classList.add("active")}),this.currentView=e}setupThemeToggle(){const e=document.getElementById("themeToggle");e&&e.addEventListener("click",()=>{const t=(document.documentElement.getAttribute("data-theme")||"light")==="light"?"dark":"light";document.documentElement.setAttribute("data-theme",t),localStorage.setItem("app-theme",t),console.log("Theme changed to:",t)});const o=localStorage.getItem("app-theme")||"light";document.documentElement.setAttribute("data-theme",o)}setupFormInteractions(){console.log("Setting up form interactions...");const e=document.getElementById("budgetRange"),o=document.getElementById("budgetAmount");e&&o&&e.addEventListener("input",()=>{o.textContent=e.value}),document.querySelectorAll(".duration-option").forEach(n=>{n.addEventListener("click",()=>{document.querySelectorAll(".duration-option").forEach(t=>t.classList.remove("selected")),n.classList.add("selected")})}),document.querySelectorAll(".interest-option").forEach(n=>{n.addEventListener("click",()=>{const t=document.querySelectorAll(".interest-option.selected");n.classList.contains("selected")?n.classList.remove("selected"):t.length<4?n.classList.add("selected"):alert("Maximum 4 interests allowed")})}),this.setupSearch(),this.setupTripGeneration(),this.setupVoiceButton()}setupSearch(){const e=document.getElementById("searchBtn"),o=document.getElementById("freeText");console.log("Setting up search - Button:",!!e,"Input:",!!o),e&&o?e.addEventListener("click",async()=>{const n=o.value.trim();if(n){console.log("Searching with Personal AI for:",n),e.textContent="AI Searching...",e.disabled=!0;try{const s=await(await fetch("https://premium-hybrid-473405-g7.uc.r.appspot.com/api/intelligence/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:n,location:"Current Location",preferences:{budgetCategory:"mid_range",destinationTypes:["urban","cultural"],activityPreferences:["food","sightseeing"]}})})).json(),i=document.getElementById("list");s.results&&s.results.length>0?i.innerHTML=s.results.map(r=>{var c,l,a;return`
                <div class="search-result ai-powered">
                  <h3>🤖 ${r.name}</h3>
                  <p>${r.description}</p>
                  <div class="result-rating">⭐ ${((c=r.rating)==null?void 0:c.toFixed(1))||"N/A"} • AI Score: ${((l=r.personalizedScore)==null?void 0:l.toFixed(1))||"N/A"}</div>
                  <div class="ai-reason">${r.personalizedReason}</div>
                  <div class="ai-tags">${((a=r.personalizedTags)==null?void 0:a.join(", "))||""}</div>
                </div>
              `}).join(""):i.innerHTML=`
                <div class="search-result">
                  <h3>🧠 AI Analysis for "${n}"</h3>
                  <p>Your Personal AI processed this search. Results: ${s.personalizedNote||"No specific results found"}</p>
                  <div class="result-rating">🤖 Powered by o3-mini</div>
                </div>
              `}catch(t){console.error("AI Search error:",t);const s=document.getElementById("list");s.innerHTML=`
              <div class="search-result">
                <h3>🔄 AI Learning Mode</h3>
                <p>Your Personal AI is initializing. This powerful backend with o3-mini reasoning will provide amazing results soon!</p>
                <div class="result-rating">🧠 Personal AI Backend Active</div>
              </div>
            `}e.textContent="Search",e.disabled=!1}}):console.error("Search elements not found - Button:",!!e,"Input:",!!o)}setupTripGeneration(){const e=document.getElementById("generateTripBtn");e&&e.addEventListener("click",async()=>{var o,n,t,s;console.log("Generating AI-powered trip..."),e.textContent="🧠 AI Thinking...",e.disabled=!0;try{const i=((o=document.querySelector(".duration-option.selected"))==null?void 0:o.textContent)||"Full day",r=Array.from(document.querySelectorAll(".interest-option.selected")).map(m=>m.textContent),c=((n=document.getElementById("budgetAmount"))==null?void 0:n.textContent)||"300",a=await(await fetch("https://premium-hybrid-473405-g7.uc.r.appspot.com/api/ai/recommend",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({preferences:{duration:i,interests:r,budget:parseInt(c),destinationType:"mixed",activities:r},context:{userId:"personal",location:"Current Location",requestType:"trip_planning"}})})).json(),p=document.getElementById("enhancedTripDisplay");if(a.recommendations)p.innerHTML=`
              <div class="trip-result ai-powered">
                <h3>🧠 Your o3-mini AI Generated Trip!</h3>
                <div class="trip-summary">
                  <div class="trip-stat">
                    <span class="stat-label">Duration:</span>
                    <span class="stat-value">${i}</span>
                  </div>
                  <div class="trip-stat">
                    <span class="stat-label">Budget:</span>
                    <span class="stat-value">$${c}</span>
                  </div>
                  <div class="trip-stat">
                    <span class="stat-label">AI Confidence:</span>
                    <span class="stat-value">${a.confidence||85}%</span>
                  </div>
                </div>
                <div class="ai-insight">
                  <strong>Personal Insight:</strong> ${a.personalizedInsight||"Your AI is learning your preferences!"}
                </div>
                <div class="learning-note">
                  <strong>Learning:</strong> ${a.learningNote||"Each interaction makes your AI smarter!"}
                </div>
                <div class="trip-content">
                  <strong>AI Recommendations:</strong>
                  <pre style="white-space: pre-wrap; font-family: inherit;">${a.recommendations.rawResponse||"AI-powered recommendations generated!"}</pre>
                </div>
                <p><strong>🤖 Powered by o3-mini reasoning</strong> - Your Personal AI is analyzing your preferences and creating the perfect trip just for you!</p>
              </div>
            `;else throw new Error("No recommendations received")}catch(i){console.error("AI Trip generation error:",i);const r=document.getElementById("enhancedTripDisplay");r.innerHTML=`
            <div class="trip-result ai-learning">
              <h3>🧠 AI Learning Your Preferences</h3>
              <div class="trip-summary">
                <div class="trip-stat">
                  <span class="stat-label">Duration:</span>
                  <span class="stat-value">${((t=document.querySelector(".duration-option.selected"))==null?void 0:t.textContent)||"Full day"}</span>
                </div>
                <div class="trip-stat">
                  <span class="stat-label">Budget:</span>
                  <span class="stat-value">$${((s=document.getElementById("budgetAmount"))==null?void 0:s.textContent)||"300"}</span>
                </div>
                <div class="trip-stat">
                  <span class="stat-label">AI Status:</span>
                  <span class="stat-value">Learning Mode</span>
                </div>
              </div>
              <p><strong>🚀 Your Personal AI (o3-mini) is initializing!</strong> Your travel intelligence system is setting up and will provide amazing personalized recommendations soon. Each interaction helps it learn your unique travel style!</p>
            </div>
          `}e.textContent="🤖 Generate Smart Trip",e.disabled=!1})}setupVoiceButton(){const e=document.getElementById("voiceBtn");if(e){let o=!1;e.addEventListener("mousedown",()=>{if(!o){o=!0,e.classList.add("listening"),e.querySelector(".voice-text").textContent="Listening... Release to stop";const n=document.getElementById("voiceStatus");n&&(n.textContent="🎤 Listening for your voice command...")}}),e.addEventListener("mouseup",()=>{if(o){o=!1,e.classList.remove("listening"),e.querySelector(".voice-text").textContent="Press & Hold to Speak";const n=document.getElementById("voiceStatus"),t=document.getElementById("voiceResponse");n&&(n.textContent="🤖 Processing your request..."),setTimeout(()=>{n&&(n.textContent=""),t&&(t.textContent="Demo: Voice recognition would work here. The AI would process your speech and provide intelligent responses!",t.style.display="block")},1500)}}),e.addEventListener("mouseleave",()=>{o&&(o=!1,e.classList.remove("listening"),e.querySelector(".voice-text").textContent="Press & Hold to Speak")})}}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",()=>{window.simpleApp=new d}):window.simpleApp=new d;console.log("Simple app loaded");
