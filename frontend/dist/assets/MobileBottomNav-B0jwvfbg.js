import{j as o}from"./index-BHBSRF_I.js";import{f as h,u as l}from"./vendor-router-sBGvKeAa.js";import{c as r}from"./card-D00CZe4s.js";import{T as d}from"./trending-up-DJhHAQ3_.js";import{U as m}from"./user-BfyReuvm.js";/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=r("ArrowLeftRight",[["path",{d:"M8 3 4 7l4 4",key:"9rb6wj"}],["path",{d:"M4 7h16",key:"6tx8e3"}],["path",{d:"m16 21 4-4-4-4",key:"siv7j2"}],["path",{d:"M20 17H4",key:"h6l3hr"}]]);/**
 * @license lucide-react v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=r("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]]),f=[{label:"Home",icon:u,path:"/dashboard"},{label:"Trades",icon:p,path:"/dashboard",hash:"#transactions"},{label:"Forecast",icon:d,path:"/dashboard",hash:"#forecast"},{label:"Account",icon:m,path:"/account"}];function j(){const t=h(),a=l(),n=e=>{e.hash?t.pathname!=="/dashboard"?(a("/dashboard"),setTimeout(()=>{document.querySelector(e.hash)?.scrollIntoView({behavior:"smooth"})},300)):document.querySelector(e.hash)?.scrollIntoView({behavior:"smooth"}):a(e.path)},c=e=>e.path==="/account"?t.pathname==="/account":e.hash?!1:t.pathname==="/dashboard";return o.jsx("nav",{className:"fixed bottom-0 left-0 right-0 z-50 md:hidden",style:{backgroundColor:"#1A231C",borderTop:"1px solid #314036",height:70,paddingTop:8,paddingBottom:10},children:o.jsx("div",{className:"flex items-center justify-around h-full",children:f.map(e=>{const s=c(e),i=e.icon;return o.jsxs("button",{onClick:()=>n(e),className:"flex flex-col items-center justify-center gap-1 flex-1",style:{color:s?"#B7E389":"#A7B7AC"},children:[o.jsx(i,{size:22}),o.jsx("span",{style:{fontSize:11,fontWeight:s?700:400},children:e.label})]},e.label)})})})}export{j as M};
