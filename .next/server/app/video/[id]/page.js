(()=>{var e={};e.id=1016,e.ids=[1016],e.modules={1833:(e,t,r)=>{"use strict";r.d(t,{A:()=>s});let s=(0,r(82614).A)("Volume2",[["path",{d:"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",key:"uqj9uw"}],["path",{d:"M16 9a5 5 0 0 1 0 6",key:"1q6k2b"}],["path",{d:"M19.364 18.364a9 9 0 0 0 0-12.728",key:"ijwkga"}]])},3295:e=>{"use strict";e.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},11516:(e,t,r)=>{"use strict";r.d(t,{A:()=>s});let s=(0,r(82614).A)("LoaderCircle",[["path",{d:"M21 12a9 9 0 1 1-6.219-8.56",key:"13zald"}]])},11997:e=>{"use strict";e.exports=require("punycode")},13071:(e,t,r)=>{Promise.resolve().then(r.bind(r,14535))},14535:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>v});var s=r(60687),i=r(43210),a=r(16189),o=r(85814),n=r.n(o),l=r(39509),d=r(66464),c=r(18780),u=r(32584),p=r(29523),m=r(89667),f=r(78726);let h=(0,r(82614).A)("Heart",[["path",{d:"M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z",key:"c3ymky"}]]);var x=r(86910),g=r(20660),b=r(85866);function v(){let e=(0,a.useParams)(),t=(0,a.useRouter)(),{user:r}=(0,c.As)(),o=e.id,[v,y]=(0,i.useState)(null),[k,w]=(0,i.useState)([]),[j,_]=(0,i.useState)(!0),[N,C]=(0,i.useState)(null),[A,z]=(0,i.useState)(!1),[E,$]=(0,i.useState)(null),[P,S]=(0,i.useState)(""),[q,D]=(0,i.useState)(!1),[M,O]=(0,i.useState)(!1),[U,L]=(0,i.useState)(!1),[I,R]=(0,i.useState)(!1);(0,i.useCallback)(async()=>{if(v&&r&&v.user_id===r.id&&!I&&window.confirm("Are you sure you want to delete this video?")){R(!0),C(null);try{let{error:e}=await d.N.from("posts").delete().eq("id",v.id);if(e)throw e;let r=[];if(v.video_url)try{let e=v.video_url.split("/public/");if(e.length>=2){let t=e[1],s=t.indexOf("/");-1!==s&&r.push(t.substring(s+1))}}catch(e){console.error("Could not parse video URL for deletion:",v.video_url,e)}if(v.thumbnail_url)try{let e=v.thumbnail_url.split("/public/");if(e.length>=2){let t=e[1],s=t.indexOf("/");-1!==s&&r.push(t.substring(s+1))}}catch(e){console.error("Could not parse thumbnail URL for deletion:",v.thumbnail_url,e)}if(r.length>0){let{error:e}=await d.N.storage.from("posts").remove(r);e&&console.error("Error deleting from storage:",e)}t.back()}catch(t){let e=t instanceof Error?t.message:String(t);console.error("Error deleting post:",t),C(`Failed to delete post: ${e}`),R(!1)}}},[v,r,I,t]);let F=(0,i.useCallback)(async()=>{if(!P.trim()||!r||!o)return;let e={post_id:o,user_id:r.id,text:P.trim()},t={...e,id:`temp-${Date.now()}`,created_at:new Date().toISOString(),profiles:{id:r.id,username:r.user_metadata?.user_name||"You",profile_picture_url:r.user_metadata?.avatar_url||null}};w(e=>[...e,t]),S("");try{let{data:r,error:s}=await d.N.from("comments").insert(e).select().single();if(s)throw s;if(!r)throw Error("Failed to retrieve inserted comment.");let i={...r,profiles:t.profiles};w(e=>e.map(e=>e.id===t.id?i:e))}catch(r){console.error("Error posting comment:",r),$(`Failed to post comment: ${r.message}`),w(e=>e.filter(e=>e.id!==t.id)),S(e.text)}},[P,r,o]);if(j)return(0,s.jsx)("div",{className:"flex justify-center items-center w-screen h-screen bg-black text-white",children:(0,s.jsx)("p",{children:"Loading video..."})});if(N)return(0,s.jsxs)("div",{className:"flex flex-col justify-center items-center w-screen h-screen bg-black text-white",children:[(0,s.jsx)("p",{className:"text-red-500 mb-4",children:N}),(0,s.jsx)(p.$,{variant:"secondary",onClick:()=>t.back(),children:"Go Back"})]});if(!v||!v.video_url)return(0,s.jsxs)("div",{className:"flex flex-col justify-center items-center w-screen h-screen bg-black text-white",children:[(0,s.jsx)("p",{className:"mb-4",children:"Video not found or source is unavailable."}),(0,s.jsx)(p.$,{variant:"secondary",onClick:()=>t.back(),children:"Go Back"})]});let{id:H,caption:T,video_url:B,thumbnail_url:G,likes_count:K,comments_count:V,views_count:Z,profiles:X}=v,Y=X?.username||"Unknown",J=X?.name||Y,Q=X?.profile_picture_url;return(0,s.jsxs)("div",{className:"fixed inset-0 flex bg-background text-foreground z-50",children:[" ",(0,s.jsx)(p.$,{variant:"ghost",size:"icon",className:"absolute top-4 left-4 text-white bg-black/50 hover:bg-black/70 rounded-full z-50",onClick:()=>t.back(),"aria-label":"Close video",children:(0,s.jsx)(f.A,{size:24})}),(0,s.jsx)("div",{className:"flex-1 bg-black flex items-center justify-center overflow-hidden relative",children:(0,s.jsx)(l.Z,{id:H,username:Y,profilePictureUrl:Q??void 0,caption:T??"",videoSrc:B,posterSrc:G??void 0,likes:(K??0).toString(),comments:(V??0).toString(),shares:(Z??0).toString(),userId:v.user_id,is_for_sale:v.is_for_sale??!1})}),(0,s.jsxs)("div",{className:"w-[400px] lg:w-[500px] border-l border-border bg-background flex flex-col h-full",children:[(0,s.jsxs)("div",{className:"p-4 border-b border-border",children:[(0,s.jsxs)("div",{className:"flex items-center justify-between mb-3",children:[(0,s.jsxs)(n(),{href:`/profile/${Y}`,className:"flex items-center gap-2 group",children:[(0,s.jsxs)(u.eu,{className:"w-10 h-10",children:[(0,s.jsx)(u.BK,{src:Q??void 0,alt:Y}),(0,s.jsx)(u.q5,{children:Y.charAt(0).toUpperCase()})]}),(0,s.jsxs)("div",{children:[(0,s.jsx)("p",{className:"font-semibold group-hover:underline",children:Y}),(0,s.jsxs)("p",{className:"text-sm text-muted-foreground",children:[J," \xb7 ",(0,s.jsx)("span",{className:"text-xs",children:"5d ago"})]})," "]})]}),(0,s.jsx)(p.$,{variant:"outline",size:"sm",children:"Follow"})," "]}),(0,s.jsx)("p",{className:"text-sm mb-2",children:T??"No caption"}),(0,s.jsx)("p",{className:"text-sm font-semibold text-muted-foreground mb-3",children:"♫ original sound - placeholder"}),(0,s.jsxs)("div",{className:"flex items-center justify-between mb-3",children:[(0,s.jsxs)("div",{className:"flex items-center gap-4",children:[(0,s.jsxs)("button",{onClick:()=>D(!q),className:"flex items-center gap-1.5 text-sm hover:text-primary",children:[(0,s.jsx)(h,{size:20,fill:q?"currentColor":"none",className:q?"text-red-500":""}),K??0]}),(0,s.jsxs)("button",{className:"flex items-center gap-1.5 text-sm hover:text-primary",children:[(0,s.jsx)(x.A,{size:20}),V??0]}),(0,s.jsxs)("button",{onClick:()=>O(!M),className:"flex items-center gap-1.5 text-sm hover:text-primary",children:[(0,s.jsx)(g.A,{size:20,fill:M?"currentColor":"none"})," 0"]})]}),(0,s.jsx)("div",{className:"flex items-center gap-2",children:(0,s.jsx)(p.$,{variant:"ghost",size:"icon",className:"hover:bg-muted","aria-label":"Share options",children:(0,s.jsx)(b.A,{size:20})})})]}),(0,s.jsxs)("div",{className:"flex items-center border border-input rounded-md bg-muted",children:[(0,s.jsxs)("p",{className:"flex-1 px-3 py-1.5 text-sm text-muted-foreground truncate",children:[window.location.href," "]}),(0,s.jsx)(p.$,{variant:"ghost",size:"sm",className:"rounded-l-none",onClick:()=>{let e=window.location.href;navigator.clipboard.writeText(e).then(()=>{L(!0),setTimeout(()=>L(!1),2e3)}).catch(e=>console.error("Failed to copy URL: ",e))},children:U?"Copied":"Copy link"})]})]}),(0,s.jsxs)("div",{className:"flex-1 overflow-y-auto p-4 space-y-4",children:[A&&(0,s.jsx)("p",{className:"text-muted-foreground text-center",children:"Loading comments..."}),E&&(0,s.jsx)("p",{className:"text-red-500 text-center",children:E}),!A&&0===k.length&&(0,s.jsx)("p",{className:"text-muted-foreground text-center",children:"No comments yet."}),k.map(e=>(0,s.jsxs)("div",{className:"flex items-start gap-2",children:[(0,s.jsxs)(u.eu,{className:"w-8 h-8",children:[(0,s.jsx)(u.BK,{src:e.profiles?.profile_picture_url??void 0,alt:e.profiles?.username??"User"}),(0,s.jsx)(u.q5,{children:e.profiles?.username?.charAt(0).toUpperCase()??"U"})]}),(0,s.jsxs)("div",{className:"text-sm flex-1",children:[(0,s.jsxs)("p",{children:[(0,s.jsx)("span",{className:"font-semibold mr-1",children:e.profiles?.username??"User"}),e.text]}),(0,s.jsxs)("div",{className:"flex items-center gap-2 text-xs text-muted-foreground mt-1",children:[(0,s.jsx)("span",{children:new Date(e.created_at).toLocaleDateString()}),(0,s.jsx)("button",{className:"hover:underline",children:"Reply"}),(0,s.jsxs)("button",{className:"flex items-center gap-0.5 hover:text-red-500",children:[(0,s.jsx)(h,{size:12})," 0 "]})]})]})]},e.id))]}),(0,s.jsx)("div",{className:"p-4 border-t border-border bg-background",children:r?(0,s.jsxs)("div",{className:"flex items-center gap-2",children:[(0,s.jsx)(m.p,{placeholder:"Add comment...",className:"flex-1",value:P,onChange:e=>S(e.target.value),onKeyPress:e=>"Enter"===e.key&&F()}),(0,s.jsx)(p.$,{onClick:F,disabled:!P.trim(),children:"Post"})]}):(0,s.jsxs)("p",{className:"text-sm text-muted-foreground text-center",children:[(0,s.jsx)(n(),{href:"#",className:"text-primary hover:underline",onClick:e=>{e.preventDefault()},children:"Log in"})," to add a comment."]})})]})]})}},19121:e=>{"use strict";e.exports=require("next/dist/server/app-render/action-async-storage.external.js")},19379:(e,t,r)=>{"use strict";r.d(t,{A:()=>s});let s=(0,r(82614).A)("ShoppingCart",[["circle",{cx:"8",cy:"21",r:"1",key:"jimo8o"}],["circle",{cx:"19",cy:"21",r:"1",key:"13723u"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",key:"9zh506"}]])},19422:(e,t,r)=>{"use strict";r.d(t,{A:()=>s});let s=(0,r(82614).A)("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]])},20660:(e,t,r)=>{"use strict";r.d(t,{A:()=>s});let s=(0,r(82614).A)("Bookmark",[["path",{d:"m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z",key:"1fy3hk"}]])},27910:e=>{"use strict";e.exports=require("stream")},29294:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-async-storage.external.js")},33873:e=>{"use strict";e.exports=require("path")},34631:e=>{"use strict";e.exports=require("tls")},37590:(e,t,r)=>{"use strict";r.d(t,{l$:()=>ed,oR:()=>q});var s,i=r(43210);let a={data:""},o=e=>"object"==typeof window?((e?e.querySelector("#_goober"):window._goober)||Object.assign((e||document.head).appendChild(document.createElement("style")),{innerHTML:" ",id:"_goober"})).firstChild:e||a,n=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,l=/\/\*[^]*?\*\/|  +/g,d=/\n+/g,c=(e,t)=>{let r="",s="",i="";for(let a in e){let o=e[a];"@"==a[0]?"i"==a[1]?r=a+" "+o+";":s+="f"==a[1]?c(o,a):a+"{"+c(o,"k"==a[1]?"":t)+"}":"object"==typeof o?s+=c(o,t?t.replace(/([^,])+/g,e=>a.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,t=>/&/.test(t)?t.replace(/&/g,e):e?e+" "+t:t)):a):null!=o&&(a=/^--/.test(a)?a:a.replace(/[A-Z]/g,"-$&").toLowerCase(),i+=c.p?c.p(a,o):a+":"+o+";")}return r+(t&&i?t+"{"+i+"}":i)+s},u={},p=e=>{if("object"==typeof e){let t="";for(let r in e)t+=r+p(e[r]);return t}return e},m=(e,t,r,s,i)=>{let a=p(e),o=u[a]||(u[a]=(e=>{let t=0,r=11;for(;t<e.length;)r=101*r+e.charCodeAt(t++)>>>0;return"go"+r})(a));if(!u[o]){let t=a!==e?e:(e=>{let t,r,s=[{}];for(;t=n.exec(e.replace(l,""));)t[4]?s.shift():t[3]?(r=t[3].replace(d," ").trim(),s.unshift(s[0][r]=s[0][r]||{})):s[0][t[1]]=t[2].replace(d," ").trim();return s[0]})(e);u[o]=c(i?{["@keyframes "+o]:t}:t,r?"":"."+o)}let m=r&&u.g?u.g:null;return r&&(u.g=u[o]),((e,t,r,s)=>{s?t.data=t.data.replace(s,e):-1===t.data.indexOf(e)&&(t.data=r?e+t.data:t.data+e)})(u[o],t,s,m),o},f=(e,t,r)=>e.reduce((e,s,i)=>{let a=t[i];if(a&&a.call){let e=a(r),t=e&&e.props&&e.props.className||/^go/.test(e)&&e;a=t?"."+t:e&&"object"==typeof e?e.props?"":c(e,""):!1===e?"":e}return e+s+(null==a?"":a)},"");function h(e){let t=this||{},r=e.call?e(t.p):e;return m(r.unshift?r.raw?f(r,[].slice.call(arguments,1),t.p):r.reduce((e,r)=>Object.assign(e,r&&r.call?r(t.p):r),{}):r,o(t.target),t.g,t.o,t.k)}h.bind({g:1});let x,g,b,v=h.bind({k:1});function y(e,t){let r=this||{};return function(){let s=arguments;function i(a,o){let n=Object.assign({},a),l=n.className||i.className;r.p=Object.assign({theme:g&&g()},n),r.o=/ *go\d+/.test(l),n.className=h.apply(r,s)+(l?" "+l:""),t&&(n.ref=o);let d=e;return e[0]&&(d=n.as||e,delete n.as),b&&d[0]&&b(n),x(d,n)}return t?t(i):i}}var k=e=>"function"==typeof e,w=(e,t)=>k(e)?e(t):e,j=(()=>{let e=0;return()=>(++e).toString()})(),_=(()=>{let e;return()=>e})(),N=(e,t)=>{switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,20)};case 1:return{...e,toasts:e.toasts.map(e=>e.id===t.toast.id?{...e,...t.toast}:e)};case 2:let{toast:r}=t;return N(e,{type:+!!e.toasts.find(e=>e.id===r.id),toast:r});case 3:let{toastId:s}=t;return{...e,toasts:e.toasts.map(e=>e.id===s||void 0===s?{...e,dismissed:!0,visible:!1}:e)};case 4:return void 0===t.toastId?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(e=>e.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let i=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(e=>({...e,pauseDuration:e.pauseDuration+i}))}}},C=[],A={toasts:[],pausedAt:void 0},z=e=>{A=N(A,e),C.forEach(e=>{e(A)})},E={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},$=(e={})=>{let[t,r]=(0,i.useState)(A),s=(0,i.useRef)(A);(0,i.useEffect)(()=>(s.current!==A&&r(A),C.push(r),()=>{let e=C.indexOf(r);e>-1&&C.splice(e,1)}),[]);let a=t.toasts.map(t=>{var r,s,i;return{...e,...e[t.type],...t,removeDelay:t.removeDelay||(null==(r=e[t.type])?void 0:r.removeDelay)||(null==e?void 0:e.removeDelay),duration:t.duration||(null==(s=e[t.type])?void 0:s.duration)||(null==e?void 0:e.duration)||E[t.type],style:{...e.style,...null==(i=e[t.type])?void 0:i.style,...t.style}}});return{...t,toasts:a}},P=(e,t="blank",r)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:"status","aria-live":"polite"},message:e,pauseDuration:0,...r,id:(null==r?void 0:r.id)||j()}),S=e=>(t,r)=>{let s=P(t,e,r);return z({type:2,toast:s}),s.id},q=(e,t)=>S("blank")(e,t);q.error=S("error"),q.success=S("success"),q.loading=S("loading"),q.custom=S("custom"),q.dismiss=e=>{z({type:3,toastId:e})},q.remove=e=>z({type:4,toastId:e}),q.promise=(e,t,r)=>{let s=q.loading(t.loading,{...r,...null==r?void 0:r.loading});return"function"==typeof e&&(e=e()),e.then(e=>{let i=t.success?w(t.success,e):void 0;return i?q.success(i,{id:s,...r,...null==r?void 0:r.success}):q.dismiss(s),e}).catch(e=>{let i=t.error?w(t.error,e):void 0;i?q.error(i,{id:s,...r,...null==r?void 0:r.error}):q.dismiss(s)}),e};var D=(e,t)=>{z({type:1,toast:{id:e,height:t}})},M=()=>{z({type:5,time:Date.now()})},O=new Map,U=1e3,L=(e,t=U)=>{if(O.has(e))return;let r=setTimeout(()=>{O.delete(e),z({type:4,toastId:e})},t);O.set(e,r)},I=e=>{let{toasts:t,pausedAt:r}=$(e);(0,i.useEffect)(()=>{if(r)return;let e=Date.now(),s=t.map(t=>{if(t.duration===1/0)return;let r=(t.duration||0)+t.pauseDuration-(e-t.createdAt);if(r<0){t.visible&&q.dismiss(t.id);return}return setTimeout(()=>q.dismiss(t.id),r)});return()=>{s.forEach(e=>e&&clearTimeout(e))}},[t,r]);let s=(0,i.useCallback)(()=>{r&&z({type:6,time:Date.now()})},[r]),a=(0,i.useCallback)((e,r)=>{let{reverseOrder:s=!1,gutter:i=8,defaultPosition:a}=r||{},o=t.filter(t=>(t.position||a)===(e.position||a)&&t.height),n=o.findIndex(t=>t.id===e.id),l=o.filter((e,t)=>t<n&&e.visible).length;return o.filter(e=>e.visible).slice(...s?[l+1]:[0,l]).reduce((e,t)=>e+(t.height||0)+i,0)},[t]);return(0,i.useEffect)(()=>{t.forEach(e=>{if(e.dismissed)L(e.id,e.removeDelay);else{let t=O.get(e.id);t&&(clearTimeout(t),O.delete(e.id))}})},[t]),{toasts:t,handlers:{updateHeight:D,startPause:M,endPause:s,calculateOffset:a}}},R=v`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,F=v`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,H=v`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,T=y("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#ff4b4b"};
  position: relative;
  transform: rotate(45deg);

  animation: ${R} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${F} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||"#fff"};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${H} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,B=v`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,G=y("div")`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||"#e0e0e0"};
  border-right-color: ${e=>e.primary||"#616161"};
  animation: ${B} 1s linear infinite;
`,K=v`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,V=v`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,Z=y("div")`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||"#61d345"};
  position: relative;
  transform: rotate(45deg);

  animation: ${K} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${V} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||"#fff"};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,X=y("div")`
  position: absolute;
`,Y=y("div")`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,J=v`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,Q=y("div")`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${J} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,W=({toast:e})=>{let{icon:t,type:r,iconTheme:s}=e;return void 0!==t?"string"==typeof t?i.createElement(Q,null,t):t:"blank"===r?null:i.createElement(Y,null,i.createElement(G,{...s}),"loading"!==r&&i.createElement(X,null,"error"===r?i.createElement(T,{...s}):i.createElement(Z,{...s})))},ee=e=>`
0% {transform: translate3d(0,${-200*e}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,et=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${-150*e}%,-1px) scale(.6); opacity:0;}
`,er=y("div")`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,es=y("div")`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,ei=(e,t)=>{let r=e.includes("top")?1:-1,[s,i]=_()?["0%{opacity:0;} 100%{opacity:1;}","0%{opacity:1;} 100%{opacity:0;}"]:[ee(r),et(r)];return{animation:t?`${v(s)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${v(i)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},ea=i.memo(({toast:e,position:t,style:r,children:s})=>{let a=e.height?ei(e.position||t||"top-center",e.visible):{opacity:0},o=i.createElement(W,{toast:e}),n=i.createElement(es,{...e.ariaProps},w(e.message,e));return i.createElement(er,{className:e.className,style:{...a,...r,...e.style}},"function"==typeof s?s({icon:o,message:n}):i.createElement(i.Fragment,null,o,n))});s=i.createElement,c.p=void 0,x=s,g=void 0,b=void 0;var eo=({id:e,className:t,style:r,onHeightUpdate:s,children:a})=>{let o=i.useCallback(t=>{if(t){let r=()=>{s(e,t.getBoundingClientRect().height)};r(),new MutationObserver(r).observe(t,{subtree:!0,childList:!0,characterData:!0})}},[e,s]);return i.createElement("div",{ref:o,className:t,style:r},a)},en=(e,t)=>{let r=e.includes("top"),s=e.includes("center")?{justifyContent:"center"}:e.includes("right")?{justifyContent:"flex-end"}:{};return{left:0,right:0,display:"flex",position:"absolute",transition:_()?void 0:"all 230ms cubic-bezier(.21,1.02,.73,1)",transform:`translateY(${t*(r?1:-1)}px)`,...r?{top:0}:{bottom:0},...s}},el=h`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,ed=({reverseOrder:e,position:t="top-center",toastOptions:r,gutter:s,children:a,containerStyle:o,containerClassName:n})=>{let{toasts:l,handlers:d}=I(r);return i.createElement("div",{id:"_rht_toaster",style:{position:"fixed",zIndex:9999,top:16,left:16,right:16,bottom:16,pointerEvents:"none",...o},className:n,onMouseEnter:d.startPause,onMouseLeave:d.endPause},l.map(r=>{let o=r.position||t,n=en(o,d.calculateOffset(r,{reverseOrder:e,gutter:s,defaultPosition:t}));return i.createElement(eo,{id:r.id,key:r.id,onHeightUpdate:d.updateHeight,className:r.visible?el:"",style:n},"custom"===r.type?w(r.message,r):a?a(r):i.createElement(ea,{toast:r,position:o}))}))}},40567:(e,t,r)=>{"use strict";r.r(t),r.d(t,{GlobalError:()=>o.a,__next_app__:()=>u,pages:()=>c,routeModule:()=>p,tree:()=>d});var s=r(65239),i=r(48088),a=r(88170),o=r.n(a),n=r(30893),l={};for(let e in n)0>["default","tree","pages","GlobalError","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>n[e]);r.d(t,l);let d={children:["",{children:["video",{children:["[id]",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(r.bind(r,61044)),"C:\\Users\\kevin\\Downloads\\Clone-https___www.tiktok.com_\\temp_unzip\\tiktok-clone\\src\\app\\video\\[id]\\page.tsx"]}]},{}]},{}]},{layout:[()=>Promise.resolve().then(r.bind(r,94431)),"C:\\Users\\kevin\\Downloads\\Clone-https___www.tiktok.com_\\temp_unzip\\tiktok-clone\\src\\app\\layout.tsx"],"not-found":[()=>Promise.resolve().then(r.t.bind(r,57398,23)),"next/dist/client/components/not-found-error"],forbidden:[()=>Promise.resolve().then(r.t.bind(r,89999,23)),"next/dist/client/components/forbidden-error"],unauthorized:[()=>Promise.resolve().then(r.t.bind(r,65284,23)),"next/dist/client/components/unauthorized-error"]}]}.children,c=["C:\\Users\\kevin\\Downloads\\Clone-https___www.tiktok.com_\\temp_unzip\\tiktok-clone\\src\\app\\video\\[id]\\page.tsx"],u={require:r,loadChunk:()=>Promise.resolve()},p=new s.AppPageRouteModule({definition:{kind:i.RouteKind.APP_PAGE,page:"/video/[id]/page",pathname:"/video/[id]",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:d}})},55511:e=>{"use strict";e.exports=require("crypto")},55591:e=>{"use strict";e.exports=require("https")},61044:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>s});let s=(0,r(12907).registerClientReference)(function(){throw Error("Attempted to call the default export of \"C:\\\\Users\\\\kevin\\\\Downloads\\\\Clone-https___www.tiktok.com_\\\\temp_unzip\\\\tiktok-clone\\\\src\\\\app\\\\video\\\\[id]\\\\page.tsx\" from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.")},"C:\\Users\\kevin\\Downloads\\Clone-https___www.tiktok.com_\\temp_unzip\\tiktok-clone\\src\\app\\video\\[id]\\page.tsx","default")},63033:e=>{"use strict";e.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},73875:(e,t,r)=>{"use strict";r.d(t,{A:()=>s});let s=(0,r(82614).A)("VolumeX",[["path",{d:"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",key:"uqj9uw"}],["line",{x1:"22",x2:"16",y1:"9",y2:"15",key:"1ewh16"}],["line",{x1:"16",x2:"22",y1:"9",y2:"15",key:"5ykzw1"}]])},74075:e=>{"use strict";e.exports=require("zlib")},76279:(e,t,r)=>{Promise.resolve().then(r.bind(r,61044))},79428:e=>{"use strict";e.exports=require("buffer")},79551:e=>{"use strict";e.exports=require("url")},81630:e=>{"use strict";e.exports=require("http")},85866:(e,t,r)=>{"use strict";r.d(t,{A:()=>s});let s=(0,r(82614).A)("Send",[["path",{d:"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",key:"1ffxy3"}],["path",{d:"m21.854 2.147-10.94 10.939",key:"12cjpa"}]])},86910:(e,t,r)=>{"use strict";r.d(t,{A:()=>s});let s=(0,r(82614).A)("MessageCircle",[["path",{d:"M7.9 20A9 9 0 1 0 4 16.1L2 22Z",key:"vv11sd"}]])},91645:e=>{"use strict";e.exports=require("net")},94735:e=>{"use strict";e.exports=require("events")}};var t=require("../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[4447,353,2733,5597,3023,9509],()=>r(40567));module.exports=s})();