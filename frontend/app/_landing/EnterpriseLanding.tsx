"use client";

import { useEffect, useRef } from "react";

/**
 * Enterprise marketing landing.
 *
 * The markup and CSS are ported verbatim from the verified design prototype
 * (demo-home.html) and injected via dangerouslySetInnerHTML so the visual is
 * pixel-identical to what was reviewed. All interactions (rotating word, live
 * feed, hamburger, smooth-scroll, dynamic lists) are wired in the effect below.
 *
 * CSS is scoped under `.ss-ent` so it never bleeds into /dashboard, /onboarding.
 */

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap');

.ss-ent *{box-sizing:border-box;margin:0;padding:0}
.ss-ent ::selection{background:#ff4d1c33;color:#f0ede8}
.ss-ent{font-family:'DM Sans',sans-serif;background:#050505;color:#f0ede8;min-height:100vh;overflow-x:hidden;-webkit-font-smoothing:antialiased;scroll-behavior:smooth}
.ss-ent a{color:inherit;text-decoration:none}

@keyframes ssfadeUp{to{opacity:1;transform:translateY(0)}}
@keyframes sspulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}
@keyframes ssslideIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

.ss-ent .fu{opacity:0;transform:translateY(20px);animation:ssfadeUp .65s forwards}

.ss-ent .ss-primary{background:#ff4d1c;color:#fff;border:none;padding:14px 32px;border-radius:7px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;cursor:pointer;transition:all .2s;letter-spacing:.01em;display:inline-flex;align-items:center;gap:8px}
.ss-ent .ss-primary:hover{background:#e63d0d;transform:translateY(-1px);box-shadow:0 10px 28px #ff4d1c44}
.ss-ent .ss-ghost{background:transparent;color:#f0ede8;border:1px solid #2a2a2a;padding:13px 28px;border-radius:7px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:400;cursor:pointer;transition:all .2s}
.ss-ent .ss-ghost:hover{border-color:#444;background:#0f0f0f}

.ss-ent .feature-pill{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:100px;border:1px solid #1a1a1a;background:#0a0a0a;font-size:13px;color:#777;transition:all .2s;cursor:default}
.ss-ent .feature-pill:hover{border-color:#333;color:#f0ede8}

.ss-ent nav{position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;justify-content:space-between;padding:0 40px;height:64px;background:#05050599;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-bottom:1px solid #141414}
.ss-ent .nav-logo{display:flex;align-items:center;gap:9px;flex-shrink:0}
.ss-ent .nav-logo-icon{width:28px;height:28px;background:#ff4d1c;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff}
.ss-ent .nav-logo-text{font-weight:600;font-size:16px;letter-spacing:-.01em}
.ss-ent .nav-links-desktop{display:flex;gap:28px}
.ss-ent .nav-link{color:#666;font-size:14px;transition:color .18s;cursor:pointer;white-space:nowrap}
.ss-ent .nav-link:hover{color:#f0ede8}
.ss-ent .nav-actions{display:flex;gap:10px;align-items:center}

.ss-ent .hamburger{display:none;flex-direction:column;justify-content:center;gap:5px;width:40px;height:40px;background:none;border:1px solid #1f1f1f;border-radius:8px;cursor:pointer;padding:6px;flex-shrink:0}
.ss-ent .hamburger span{display:block;height:1.5px;background:#888;border-radius:2px;transition:all .25s;transform-origin:center}
.ss-ent .hamburger:hover span{background:#f0ede8}
.ss-ent .hamburger.open{border-color:#333}
.ss-ent .hamburger.open span:nth-child(1){transform:translateY(6.5px) rotate(45deg);background:#f0ede8}
.ss-ent .hamburger.open span:nth-child(2){opacity:0}
.ss-ent .hamburger.open span:nth-child(3){transform:translateY(-6.5px) rotate(-45deg);background:#f0ede8}

.ss-ent .mobile-menu{display:none;position:fixed;top:64px;left:0;right:0;z-index:99;background:#080808;border-bottom:1px solid #1a1a1a;flex-direction:column;padding:0;box-shadow:0 20px 40px rgba(0,0,0,.6)}
.ss-ent .mobile-menu.open{display:flex}
.ss-ent .mob-nav-links{padding:8px 0}
.ss-ent .mob-nav-link{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;font-size:15px;font-weight:400;color:#888;background:none;border:none;width:100%;text-align:left;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .15s;border-bottom:1px solid #0f0f0f}
.ss-ent .mob-nav-link:hover{color:#f0ede8;background:#0a0a0a}
.ss-ent .mob-nav-link:last-child{border-bottom:none}
.ss-ent .mob-nav-link .arrow{color:#333;font-size:12px;transition:color .15s}
.ss-ent .mob-nav-link:hover .arrow{color:#666}
.ss-ent .mob-actions{padding:16px 20px;border-top:1px solid #141414;display:flex;flex-direction:column;gap:10px}
.ss-ent .mob-sign-in{display:block;width:100%;padding:13px;text-align:center;font-size:14px;font-weight:500;color:#888;background:none;border:1px solid #2a2a2a;border-radius:7px;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .15s}
.ss-ent .mob-sign-in:hover{color:#f0ede8;border-color:#444}
.ss-ent .mob-cta{display:block;width:100%;padding:14px;text-align:center;font-size:14px;font-weight:600;color:#fff;background:#ff4d1c;border:none;border-radius:7px;font-family:'DM Sans',sans-serif;cursor:pointer;letter-spacing:.01em;transition:background .15s}
.ss-ent .mob-cta:hover{background:#e63d0d}

.ss-ent .hero{min-height:100vh;padding:80px 40px 60px;max-width:1200px;margin:0 auto;display:flex;flex-direction:column;justify-content:center;position:relative}
.ss-ent .hero-grid{display:grid;grid-template-columns:1fr 420px;gap:64px;align-items:center;position:relative;z-index:1}
.ss-ent .hero-bg-grid{position:absolute;inset:0;z-index:0;background-image:linear-gradient(#161616 1px,transparent 1px),linear-gradient(90deg,#161616 1px,transparent 1px);background-size:56px 56px;opacity:.22;mask-image:radial-gradient(ellipse 90% 70% at 50% 0%,black,transparent);-webkit-mask-image:radial-gradient(ellipse 90% 70% at 50% 0%,black,transparent)}
.ss-ent .hero-glow{position:absolute;top:5%;left:55%;transform:translateX(-50%);width:700px;height:500px;z-index:0;background:radial-gradient(ellipse,#ff4d1c14 0%,transparent 65%);pointer-events:none}

.ss-ent .live-feed{border:1px solid #1a1a1a;border-radius:14px;background:#080808;overflow:hidden}
.ss-ent .feed-header{padding:14px 20px;border-bottom:1px solid #141414;display:flex;align-items:center;justify-content:space-between}
.ss-ent .feed-dot{width:7px;height:7px;border-radius:50%;background:#22c55e;animation:sspulse 2s ease-in-out infinite}
.ss-ent .feed-row{padding:14px 20px;border-bottom:1px solid #0f0f0f;display:flex;align-items:center;gap:14px}
.ss-ent .feed-row:last-child{border-bottom:none}
.ss-ent .feed-row.new{animation:ssslideIn .35s ease}

.ss-ent .stat-mini{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.ss-ent .stat-mini-card{padding:18px 20px;border:1px solid #1a1a1a;border-radius:12px;background:#080808}

.ss-ent .pos-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px;border:1px solid #141414;border-radius:14px;overflow:hidden}
.ss-ent .pos-col{padding:44px 48px}

.ss-ent footer{padding:28px 40px;border-top:1px solid #111;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px}
.ss-ent footer a:hover{color:#777 !important}

@media(max-width:900px){
  .ss-ent .hero-grid{grid-template-columns:1fr!important}
  .ss-ent .feed-col{display:none!important}
  .ss-ent .pos-grid{grid-template-columns:1fr!important}
  .ss-ent .pos-col{padding:32px 28px!important}
  .ss-ent .hero{padding:90px 32px 60px!important}
}
@media(max-width:640px){
  .ss-ent nav{padding:0 20px!important}
  .ss-ent .hero{padding:88px 20px 48px!important}
  .ss-ent .hero-grid{gap:24px!important}
  .ss-ent .hero-btns{flex-direction:column!important;gap:10px!important}
  .ss-ent .hero-btns .ss-primary,.ss-ent .hero-btns .ss-ghost{width:100%!important;justify-content:center!important;padding:14px!important}
  .ss-ent .nav-links-desktop{display:none!important}
  .ss-ent .nav-actions{display:none!important}
  .ss-ent .hamburger{display:flex!important}
  .ss-ent .feature-pills-wrap{padding:18px 20px!important}
  .ss-ent .positioning{padding:48px 20px!important}
  .ss-ent .bottom-cta{padding:40px 20px 72px!important}
  .ss-ent .cta-inner{padding:36px 22px!important;border-radius:14px!important}
  .ss-ent footer{padding:24px 20px!important;flex-direction:column!important;align-items:flex-start!important;gap:16px!important}
  .ss-ent .pos-col{padding:28px 20px!important}
  .ss-ent #logos-row{gap:8px!important}
  .ss-ent .hero-pill-wrap{margin-bottom:20px!important}
  .ss-ent .hero-pill{font-size:12px!important;padding:6px 12px!important}
  .ss-ent .hero-sub{font-size:15px!important;margin-bottom:28px!important}
  .ss-ent .social-label{margin-top:24px!important}
}
@media(max-width:420px){
  .ss-ent .hero{padding:80px 16px 40px!important}
  .ss-ent .feature-pills-wrap{padding:16px!important}
  .ss-ent .positioning{padding:36px 16px!important}
  .ss-ent .bottom-cta{padding:32px 16px 60px!important}
  .ss-ent .cta-inner{padding:28px 18px!important}
  .ss-ent footer{padding:20px 16px!important}
  .ss-ent nav{padding:0 16px!important}
  .ss-ent .stat-mini{grid-template-columns:1fr 1fr!important}
  .ss-ent .cta-btns{flex-direction:column!important;gap:10px!important}
  .ss-ent .cta-btns .ss-primary,.ss-ent .cta-btns .ss-ghost{width:100%!important;justify-content:center!important}
}
`;

const BODY_HTML = `
<nav>
  <div class="nav-logo">
    <div class="nav-logo-icon">S</div>
    <span class="nav-logo-text">Stock<span style="color:#ff4d1c">Sense</span></span>
  </div>
  <div class="nav-links-desktop">
    <a class="nav-link" data-scroll="positioning">How it works</a>
    <a class="nav-link" data-scroll="pricing">Pricing</a>
    <a class="nav-link" data-scroll="pricing">Docs</a>
  </div>
  <div class="nav-actions">
    <a href="/onboarding"><button class="ss-ghost" style="padding:8px 18px;font-size:13px">Sign in</button></a>
    <button class="ss-primary" data-scroll="pricing" style="padding:8px 20px;font-size:13px">Request a Pilot →</button>
  </div>
  <button class="hamburger" id="hamburger" aria-label="Open menu"><span></span><span></span><span></span></button>
</nav>

<div class="mobile-menu" id="mobile-menu">
  <div class="mob-nav-links">
    <button class="mob-nav-link" data-scroll="positioning" data-closemenu>How it works <span class="arrow">→</span></button>
    <button class="mob-nav-link" data-scroll="pricing" data-closemenu>Pricing <span class="arrow">→</span></button>
    <button class="mob-nav-link" data-scroll="pricing" data-closemenu>Docs <span class="arrow">→</span></button>
  </div>
  <div class="mob-actions">
    <a href="/onboarding"><button class="mob-sign-in">Sign in</button></a>
    <button class="mob-cta" data-scroll="pricing" data-closemenu>Request a Pilot →</button>
  </div>
</div>

<section class="hero">
  <div class="hero-bg-grid"></div>
  <div class="hero-glow"></div>
  <div class="hero-grid">
    <div>
      <div class="fu hero-pill-wrap" style="animation-delay:.05s;margin-bottom:28px">
        <a id="pill" class="hero-pill" data-scroll="pricing" style="display:inline-flex;align-items:center;gap:8px;font-size:13px;color:#888;border:1px solid #1f1f1f;padding:7px 16px;border-radius:100px;background:#0a0a0a;transition:border-color .2s,color .2s;cursor:pointer">
          <span style="width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 6px #22c55e88"></span>
          90-day enterprise pilot · Fixed price, zero commitment
          <span style="font-size:11px;color:#444">→</span>
        </a>
      </div>
      <h1 class="fu" style="animation-delay:.15s;font-family:'Instrument Serif',serif;font-size:clamp(46px,6.5vw,84px);font-weight:400;line-height:1.06;letter-spacing:-.03em;margin-bottom:28px">
        The agent that<br/>
        <span id="rotating-word" style="color:#ff4d1c;font-style:italic;display:inline-block;min-width:160px;transition:opacity .28s ease,transform .28s ease">acts.</span>
      </h1>
      <p class="fu hero-sub" style="animation-delay:.28s;font-size:18px;color:#888;line-height:1.7;max-width:480px;margin-bottom:40px;font-weight:300">
        Connect your ERP, WMS or logistics system. StockSense reads your inventory, reasons through it like an ops manager, and generates purchase orders automatically, before you run out.
      </p>
      <div class="fu hero-btns" style="animation-delay:.38s;display:flex;gap:12px;flex-wrap:wrap">
        <button class="ss-primary" data-scroll="pricing" style="font-size:15px">Request a Pilot →</button>
        <button class="ss-ghost" data-scroll="positioning" style="font-size:15px">See how it works</button>
      </div>
      <div class="fu social-label" style="animation-delay:.5s;margin-top:36px">
        <div style="font-size:11px;color:#333;letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px">Built with</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center" id="logos-row"></div>
      </div>
    </div>
    <div class="feed-col fu" style="animation-delay:.45s">
      <div class="live-feed">
        <div class="feed-header">
          <div style="display:flex;align-items:center;gap:8px">
            <div class="feed-dot"></div>
            <span style="font-size:12px;color:#555;font-family:'JetBrains Mono',monospace">agent · live</span>
          </div>
          <span style="font-size:11px;color:#333">last 24h</span>
        </div>
        <div id="feed-rows"></div>
      </div>
      <div class="stat-mini">
        <div class="stat-mini-card">
          <div style="font-family:'Instrument Serif',serif;font-size:26px;color:#f0ede8">12d</div>
          <div style="font-size:11px;color:#444;margin-top:6px;line-height:1.4">avg stockout predicted early</div>
        </div>
        <div class="stat-mini-card">
          <div style="font-family:'Instrument Serif',serif;font-size:26px;color:#f0ede8">1-click</div>
          <div style="font-size:11px;color:#444;margin-top:6px;line-height:1.4">to approve &amp; send PO</div>
        </div>
      </div>
    </div>
  </div>
</section>

<div style="border-top:1px solid #111;border-bottom:1px solid #111;padding:28px 40px;background:#080808" class="feature-pills-wrap">
  <div style="max-width:1200px;margin:0 auto;display:flex;gap:10px;flex-wrap:wrap" id="feature-pills"></div>
</div>

<section id="positioning" class="positioning" style="padding:80px 40px;max-width:1200px;margin:0 auto">
  <div class="pos-grid">
    <div class="pos-col" style="background:#080808;border-right:1px solid #141414">
      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#333;margin-bottom:24px;font-weight:500">Every other tool</div>
      <div id="old-world"></div>
    </div>
    <div class="pos-col" style="background:#0a0806">
      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#ff4d1c;margin-bottom:24px;font-weight:500">StockSense Agent</div>
      <div id="new-world"></div>
    </div>
  </div>
</section>

<section id="pricing" style="padding:80px 40px;max-width:1200px;margin:0 auto">
  <div style="text-align:center;margin-bottom:56px">
    <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#ff4d1c;margin-bottom:16px;font-weight:500">Pilot Program</div>
    <h2 style="font-family:'Instrument Serif',serif;font-size:clamp(30px,4vw,48px);font-weight:400;letter-spacing:-.02em;line-height:1.15;margin-bottom:14px">
      One fixed price.<br/><span style="font-style:italic;color:#555">Zero ambiguity.</span>
    </h2>
    <p style="color:#555;font-size:15px;max-width:480px;margin:0 auto;line-height:1.6">Start with a single vessel or logistics flow. No long-term commitment. Full results in 90 days.</p>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:820px;margin:0 auto" class="pricing-grid">
    <div style="border:1px solid #ff4d1c44;border-radius:16px;background:#0a0806;padding:40px;position:relative">
      <div style="position:absolute;top:-13px;left:50%;transform:translateX(-50%);background:#ff4d1c;color:#fff;font-size:10px;font-weight:600;letter-spacing:.1em;padding:5px 18px;border-radius:100px;white-space:nowrap">90-DAY PROOF</div>
      <div style="font-size:11px;color:#ff4d1c;font-weight:600;letter-spacing:.1em;margin-bottom:16px">PILOT</div>
      <div style="font-family:'Instrument Serif',serif;font-size:52px;font-weight:400;line-height:1;color:#f0ede8;margin-bottom:4px">$25,650</div>
      <div style="font-size:13px;color:#444;margin-bottom:32px">fixed fee · all-inclusive · one payment</div>
      <ul style="list-style:none;margin-bottom:36px;display:flex;flex-direction:column;gap:12px">
        <li style="display:flex;gap:10px;font-size:14px;color:#888"><span style="color:#22c55e;flex-shrink:0">✓</span>1 vessel or logistics flow</li>
        <li style="display:flex;gap:10px;font-size:14px;color:#888"><span style="color:#22c55e;flex-shrink:0">✓</span>Integration managed entirely by us</li>
        <li style="display:flex;gap:10px;font-size:14px;color:#888"><span style="color:#22c55e;flex-shrink:0">✓</span>Live in 2 weeks, no infrastructure changes</li>
        <li style="display:flex;gap:10px;font-size:14px;color:#888"><span style="color:#22c55e;flex-shrink:0">✓</span>Success metrics agreed before we start</li>
        <li style="display:flex;gap:10px;font-size:14px;color:#888"><span style="color:#22c55e;flex-shrink:0">✓</span>Full hands-on support for 90 days</li>
        <li style="display:flex;gap:10px;font-size:14px;color:#888"><span style="color:#22c55e;flex-shrink:0">✓</span>KPI report + full data export</li>
        <li style="display:flex;gap:10px;font-size:14px;color:#888"><span style="color:#22c55e;flex-shrink:0">✓</span>NDA + data confidentiality agreement</li>
      </ul>
      <a href="mailto:albion@interlutyinc.com?subject=StockSense%20Pilot%20Request&body=Hi%20Albion%2C%20I%27d%20like%20to%20discuss%20a%20pilot." style="display:block">
        <button class="ss-primary" style="font-size:15px;width:100%;justify-content:center">Request this pilot →</button>
      </a>
    </div>
    <div style="border:1px solid #1a1a1a;border-radius:16px;background:#080808;padding:40px">
      <div style="font-size:11px;color:#555;font-weight:600;letter-spacing:.1em;margin-bottom:16px">ENTERPRISE</div>
      <div style="font-family:'Instrument Serif',serif;font-size:52px;font-weight:400;line-height:1;color:#f0ede8;margin-bottom:4px">Custom</div>
      <div style="font-size:13px;color:#444;margin-bottom:32px">pricing · ongoing contract</div>
      <ul style="list-style:none;margin-bottom:36px;display:flex;flex-direction:column;gap:12px">
        <li style="display:flex;gap:10px;font-size:14px;color:#666"><span style="color:#555;flex-shrink:0">✓</span>Multi-site or multi-vessel</li>
        <li style="display:flex;gap:10px;font-size:14px;color:#666"><span style="color:#555;flex-shrink:0">✓</span>Full ERP integration (SAP, Oracle)</li>
        <li style="display:flex;gap:10px;font-size:14px;color:#666"><span style="color:#555;flex-shrink:0">✓</span>SLA &amp; uptime guarantee</li>
        <li style="display:flex;gap:10px;font-size:14px;color:#666"><span style="color:#555;flex-shrink:0">✓</span>Dedicated account manager</li>
        <li style="display:flex;gap:10px;font-size:14px;color:#666"><span style="color:#555;flex-shrink:0">✓</span>Custom reporting &amp; dashboards</li>
        <li style="display:flex;gap:10px;font-size:14px;color:#666"><span style="color:#555;flex-shrink:0">✓</span>NDA + enterprise agreement</li>
      </ul>
      <a href="mailto:albion@interlutyinc.com?subject=StockSense%20Enterprise%20Inquiry" style="display:block">
        <button class="ss-ghost" style="font-size:15px;width:100%;justify-content:center">Talk to us →</button>
      </a>
    </div>
  </div>
  <div style="max-width:820px;margin:28px auto 0;border:1px solid #1a1a1a;border-radius:12px;padding:24px 32px;background:#080808;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;text-align:center" class="day90-grid">
    <div>
      <div style="font-size:11px;color:#ff4d1c;font-weight:600;letter-spacing:.1em;margin-bottom:8px">AT DAY 90</div>
      <div style="font-size:13px;color:#666;line-height:1.6">Continue, expand or walk away. No strings attached, no renewal pressure.</div>
    </div>
    <div style="border-left:1px solid #1a1a1a;border-right:1px solid #1a1a1a;padding:0 24px">
      <div style="font-size:11px;color:#ff4d1c;font-weight:600;letter-spacing:.1em;margin-bottom:8px">YOUR DATA</div>
      <div style="font-size:13px;color:#666;line-height:1.6">Fully destroyed at contract expiry. Nothing retained. Guaranteed in writing.</div>
    </div>
    <div>
      <div style="font-size:11px;color:#ff4d1c;font-weight:600;letter-spacing:.1em;margin-bottom:8px">ONE AGREEMENT</div>
      <div style="font-size:13px;color:#666;line-height:1.6">2-page contract. Lean, clear, ready to sign. No legal complexity.</div>
    </div>
  </div>
  <p style="text-align:center;font-size:12px;color:#2a2a2a;margin-top:20px">No hidden costs · No per-seat pricing · No long-term obligation</p>
</section>

<section class="bottom-cta" style="padding:40px 40px 100px;max-width:700px;margin:0 auto;text-align:center">
  <div class="cta-inner" style="padding:64px 48px;border:1px solid #1a1a1a;border-radius:18px;background:#080808;position:relative;overflow:hidden">
    <div style="position:absolute;top:-60px;left:50%;transform:translateX(-50%);width:340px;height:240px;background:radial-gradient(ellipse,#ff4d1c12,transparent 68%);pointer-events:none"></div>
    <div style="position:relative">
      <h2 style="font-family:'Instrument Serif',serif;font-size:clamp(28px,4vw,44px);font-weight:400;letter-spacing:-.02em;margin-bottom:14px;line-height:1.15">
        Your inventory shouldn't<br/><span style="font-style:italic;color:#888">need your attention.</span>
      </h2>
      <p style="color:#555;font-size:15px;margin-bottom:36px;line-height:1.6">
        Connect your inventory system in days. StockSense starts reasoning through your data immediately, with no disruption to existing infrastructure.
      </p>
      <div class="cta-btns" style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        <a href="mailto:albion@interlutyinc.com?subject=StockSense%20Pilot%20Request"><button class="ss-primary" style="font-size:15px">Request a Pilot →</button></a>
        <button class="ss-ghost" data-scroll="pricing" style="font-size:15px">View pilot details</button>
      </div>
      <div style="margin-top:20px;font-size:12px;color:#333">Fixed fee · 90 days · No long-term commitment</div>
    </div>
  </div>
</section>

<footer>
  <div style="display:flex;align-items:center;gap:8px">
    <div style="width:22px;height:22px;background:#ff4d1c;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">S</div>
    <span style="font-weight:500;font-size:14px">StockSense</span>
    <span style="color:#252525;font-size:13px;margin-left:6px">· by Interluty Inc.</span>
  </div>
  <div style="font-size:12px;color:#252525">© 2026 StockSense</div>
  <div style="display:flex;gap:22px;font-size:13px;color:#333">
    <a href="#" style="transition:color .2s">Privacy</a>
    <a href="#" style="transition:color .2s">Terms</a>
    <a href="#" style="transition:color .2s">Docs</a>
  </div>
</footer>
`;

const WORDS = ["acts.", "reasons.", "predicts.", "decides.", "ships."];

const FEED_ITEMS = [
  { store: "Vessel · Deck A", action: "PO generated", sku: "Provisions · Dairy", qty: "340 units", dot: "#22c55e", time: "2m ago" },
  { store: "Warehouse · Milan", action: "Stockout prevented", sku: "Spare Parts · HX-44", qty: "60 units", dot: "#3b82f6", time: "9m ago" },
  { store: "Fleet · Unit 07", action: "Reorder approved", sku: "Hotel Amenities", qty: "800 units", dot: "#ff4d1c", time: "17m ago" },
  { store: "Port · Barcelona", action: "Demand spike detected", sku: "Beverage Stock", qty: "alert", dot: "#f59e0b", time: "34m ago" },
  { store: "Vessel · Deck B", action: "PO sent to supplier", sku: "Linens · Set XL", qty: "220 units", dot: "#22c55e", time: "48m ago" },
];

const LOGOS = ["SAP", "Oracle", "ERP", "Shopify", "AWS", "Stripe"];

const FEATURES = [
  { icon: "⚡", label: "Real-time sync" },
  { icon: "🧠", label: "AI reasoning" },
  { icon: "📋", label: "Auto PO generation" },
  { icon: "✉️", label: "Supplier email" },
  { icon: "📈", label: "Demand forecasting" },
  { icon: "🔒", label: "Closed-loop data" },
];

const OLD_WORLD = [
  "Shows you a dashboard of stock levels",
  "Sends an alert when you're already too late",
  "Tells you what happened",
  "You still decide what to order and when",
  "Black box, zero explanation",
];

const NEW_WORLD = [
  "Reasons through data like an ops manager",
  "Predicts stockouts weeks before they happen",
  "Tells you what to do, and exactly why",
  "Generates purchase orders autonomously",
  "Explains every decision in plain language",
];

export function EnterpriseLanding() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const timers: number[] = [];
    const cleanups: Array<() => void> = [];

    const $ = (sel: string) => root.querySelector(sel) as HTMLElement | null;

    // Smooth scroll wiring
    root.querySelectorAll<HTMLElement>("[data-scroll]").forEach((el) => {
      const handler = () => {
        const target = root.querySelector(`#${el.dataset.scroll}`);
        target?.scrollIntoView({ behavior: "smooth" });
        if (el.hasAttribute("data-closemenu")) closeMenu();
      };
      el.addEventListener("click", handler);
      cleanups.push(() => el.removeEventListener("click", handler));
    });

    // Hamburger / mobile menu
    const hamburger = $("#hamburger");
    const mobileMenu = $("#mobile-menu");
    function closeMenu() {
      hamburger?.classList.remove("open");
      mobileMenu?.classList.remove("open");
    }
    const toggleMenu = () => {
      hamburger?.classList.toggle("open");
      mobileMenu?.classList.toggle("open");
    };
    if (hamburger) {
      hamburger.addEventListener("click", toggleMenu);
      cleanups.push(() => hamburger.removeEventListener("click", toggleMenu));
    }
    const onResize = () => {
      if (window.innerWidth > 640) closeMenu();
    };
    window.addEventListener("resize", onResize);
    cleanups.push(() => window.removeEventListener("resize", onResize));

    // Rotating hero word
    const wordEl = $("#rotating-word");
    let wordIdx = 0;
    if (wordEl) {
      const rot = window.setInterval(() => {
        wordEl.style.opacity = "0";
        wordEl.style.transform = "translateY(-10px)";
        const t = window.setTimeout(() => {
          wordIdx = (wordIdx + 1) % WORDS.length;
          wordEl.textContent = WORDS[wordIdx]!;
          wordEl.style.opacity = "1";
          wordEl.style.transform = "translateY(0)";
        }, 280);
        timers.push(t);
      }, 2200);
      timers.push(rot);
    }

    // Live feed
    const feedEl = $("#feed-rows");
    let feedOffset = 0;
    const renderFeed = () => {
      if (!feedEl) return;
      const items = [0, 1, 2].map((n) => FEED_ITEMS[(feedOffset + n) % FEED_ITEMS.length]!);
      feedEl.innerHTML = items
        .map(
          (item, i) => `
        <div class="feed-row${i === 0 ? " new" : ""}">
          <div style="width:8px;height:8px;border-radius:50%;background:${item.dot};flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:baseline">
              <span style="font-size:13px;color:#f0ede8;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">${item.action}</span>
              <span style="font-size:11px;color:#333;flex-shrink:0;margin-left:8px">${item.time}</span>
            </div>
            <div style="font-size:12px;color:#555;margin-top:2px">${item.store} · ${item.sku} · <span style="color:#444">${item.qty}</span></div>
          </div>
        </div>`,
        )
        .join("");
    };
    renderFeed();
    if (feedEl) {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              const iv = window.setInterval(() => {
                feedOffset++;
                renderFeed();
              }, 2800);
              timers.push(iv);
              obs.disconnect();
            }
          });
        },
        { threshold: 0.1 },
      );
      obs.observe(feedEl);
      cleanups.push(() => obs.disconnect());
    }

    // Logos
    const logosRow = $("#logos-row");
    if (logosRow) {
      logosRow.innerHTML = LOGOS.map(
        (l) =>
          `<span style="font-size:12px;color:#3a3a3a;font-weight:500;letter-spacing:.02em;padding:5px 12px;border:1px solid #1a1a1a;border-radius:6px;background:#080808">${l}</span>`,
      ).join("");
    }

    // Feature pills
    const pills = $("#feature-pills");
    if (pills) {
      pills.innerHTML = FEATURES.map(
        (f) => `<div class="feature-pill"><span style="font-size:14px">${f.icon}</span>${f.label}</div>`,
      ).join("");
    }

    // Positioning lists
    const oldWorld = $("#old-world");
    if (oldWorld) {
      oldWorld.innerHTML = OLD_WORLD.map(
        (t) =>
          `<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px"><span style="color:#2a2a2a;font-size:14px;margin-top:1px;flex-shrink:0">✕</span><span style="font-size:14px;color:#444;line-height:1.5">${t}</span></div>`,
      ).join("");
    }
    const newWorld = $("#new-world");
    if (newWorld) {
      newWorld.innerHTML = NEW_WORLD.map(
        (t) =>
          `<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:16px"><span style="color:#22c55e;font-size:14px;margin-top:1px;flex-shrink:0">✓</span><span style="font-size:14px;color:#999;line-height:1.5">${t}</span></div>`,
      ).join("");
    }

    // Pill hover
    const pill = $("#pill");
    if (pill) {
      const enter = () => {
        pill.style.borderColor = "#333";
        pill.style.color = "#f0ede8";
      };
      const leave = () => {
        pill.style.borderColor = "#1f1f1f";
        pill.style.color = "#888";
      };
      pill.addEventListener("mouseenter", enter);
      pill.addEventListener("mouseleave", leave);
      cleanups.push(() => {
        pill.removeEventListener("mouseenter", enter);
        pill.removeEventListener("mouseleave", leave);
      });
    }

    return () => {
      timers.forEach((t) => clearInterval(t));
      timers.forEach((t) => clearTimeout(t));
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return (
    <div className="ss-ent" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div dangerouslySetInnerHTML={{ __html: BODY_HTML }} />
    </div>
  );
}
