/*
 * Utsuroba Reading Engine — Pass 4
 *
 * This module owns the reading UI and episode contract. Utsuroba only tells it
 * which drifter/quest is active and what to do when the episode is complete.
 */
(function () {
  let overlay = null;
  let style = null;
  let open = false;
  let closeCallback = null;
  let previousFocus = null;

  function escapeText(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function focusFirstControl() {
    if (!overlay) return;
    const controls = Array.from(overlay.querySelectorAll('button:not([disabled])'));
    const control = controls.find(button => {
      const details = button.closest('details');
      return (!details || details.open) && button.getClientRects().length > 0;
    }) || controls[0];
    if (control && typeof control.focus === 'function') requestAnimationFrame(() => control.focus());
  }

  function trapFocus(event) {
    if (event.key !== 'Tab' || !overlay) return;
    const controls = Array.from(overlay.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(control => {
        const details = control.closest('details');
        return (!details || details.open) && control.getClientRects().length > 0;
      });
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!overlay.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function installStyle() {
    if (style) return;
    style = document.createElement('style');
    style.textContent = `
      #utsuroba-reading-challenge .reading-card{position:relative;width:min(920px,100%);max-height:calc(100vh - 36px);overflow:auto;background:linear-gradient(160deg,#171020,#0b0712 65%,#130b1b);border:1px solid rgba(220,160,255,.45);border-radius:16px;padding:clamp(20px,3vw,34px);box-shadow:0 0 70px rgba(100,30,160,.34);box-sizing:border-box;}
      #utsuroba-reading-challenge .reading-close{position:absolute;right:14px;top:12px;background:transparent;border:0;color:rgba(255,255,255,.55);font-size:18px;cursor:pointer;padding:8px;}
      #utsuroba-reading-challenge button:focus-visible{outline:3px solid #ffdf9b;outline-offset:3px;}
      #utsuroba-reading-challenge{overscroll-behavior:contain;}
      #utsuroba-reading-challenge .reading-eyebrow{color:#d8a8ff;font:700 11px/1.4 monospace;letter-spacing:.16em;text-transform:uppercase;margin-bottom:8px;}
      #utsuroba-reading-challenge .reading-support-badge{display:inline-block;margin:0 0 9px;padding:4px 7px;border:1px solid rgba(216,168,255,.35);border-radius:999px;color:#e4c2ff;font:700 9px/1.2 monospace;letter-spacing:.08em;}
      #utsuroba-reading-challenge .reading-support-badge.independent{border-color:rgba(255,203,117,.48);color:#ffe0a0;}
      #utsuroba-reading-challenge h2{margin:0 42px 8px;color:#fff4ff;font-size:clamp(1.25rem,3vw,2rem);}
      #utsuroba-reading-challenge h2 span{display:block;color:rgba(255,220,255,.58);font-size:.52em;font-weight:400;margin-top:4px;}
      #utsuroba-reading-challenge h3{margin:5px 0 2px;color:#fff;font-size:clamp(1rem,2.3vw,1.25rem);}
      #utsuroba-reading-challenge .reading-intro{margin:0;color:#f5e8ff;line-height:1.5;font-size:clamp(.86rem,1.8vw,1rem);}
      #utsuroba-reading-challenge .reading-jp{margin:2px 0 12px;color:rgba(245,232,255,.54);font-size:.78rem;line-height:1.45;}
      #utsuroba-reading-challenge .reading-vocab{margin:14px 0 18px;border:1px solid rgba(216,168,255,.2);border-radius:9px;background:rgba(255,255,255,.035);}
      #utsuroba-reading-challenge .reading-vocab summary{cursor:pointer;padding:10px 12px;color:#e4c2ff;font-size:.78rem;font-weight:700;list-style-position:inside;}
      #utsuroba-reading-challenge .reading-vocab summary span{display:block;margin:3px 0 0 18px;color:rgba(245,232,255,.5);font-size:.68rem;font-weight:400;}
      #utsuroba-reading-challenge .reading-vocab-body{padding:0 12px 12px;}
      #utsuroba-reading-challenge .reading-vocab-list{display:flex;flex-wrap:wrap;gap:7px;}
      #utsuroba-reading-challenge .reading-vocab-word{padding:6px 9px;border:1px solid rgba(216,168,255,.35);border-radius:999px;background:rgba(216,168,255,.08);color:#fff;cursor:pointer;font:700 .74rem Georgia,serif;}
      #utsuroba-reading-challenge .reading-vocab-word:hover,#utsuroba-reading-challenge .reading-vocab-word:focus-visible{border-color:#d8a8ff;background:rgba(216,168,255,.2);outline:none;}
      #utsuroba-reading-challenge .reading-vocab-detail{min-height:34px;margin-top:10px;padding:8px 10px;border-left:2px solid #ffcb75;background:rgba(255,203,117,.07);color:#ffe7b2;font-size:.78rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-vocab-detail strong{color:#fff;font-size:.86rem;}
      #utsuroba-reading-challenge .reading-vocab-detail small{display:block;margin-top:3px;color:rgba(255,231,178,.65);font-size:.9em;}
      #utsuroba-reading-challenge .reading-transcript{display:grid;gap:8px;margin:18px 0 20px;padding:14px;background:rgba(255,255,255,.045);border:1px solid rgba(220,160,255,.16);border-radius:10px;}
      #utsuroba-reading-challenge .reading-line{padding-left:12px;border-left:2px solid rgba(216,168,255,.45);}
      #utsuroba-reading-challenge .reading-line.is-evidence{border-left-color:#ffcb75;background:rgba(255,203,117,.12);box-shadow:inset 3px 0 0 #ffcb75;padding-top:5px;padding-bottom:5px;border-radius:0 5px 5px 0;animation:readingEvidenceIn .32s ease-out both;}
      #utsuroba-reading-challenge .reading-speaker{color:#d8a8ff;font-size:.74rem;font-weight:700;letter-spacing:.05em;}
      #utsuroba-reading-challenge .reading-en{color:#fff;font-size:.9rem;line-height:1.35;margin-top:2px;}
      #utsuroba-reading-challenge .reading-question-label{color:#ffcb75;font:700 10px/1.4 monospace;letter-spacing:.14em;margin-top:8px;}
      #utsuroba-reading-challenge .reading-choices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px;}
      #utsuroba-reading-challenge .reading-choice{min-height:72px;text-align:left;padding:11px 12px;background:rgba(255,255,255,.06);border:1px solid rgba(220,160,255,.34);border-radius:9px;color:#fff;cursor:pointer;font:inherit;transition:transform .15s,border-color .15s,background .15s;}
      #utsuroba-reading-challenge .reading-choice:hover{transform:translateY(-2px);background:rgba(216,168,255,.14);border-color:#d8a8ff;}
      #utsuroba-reading-challenge .reading-choice small{display:block;color:rgba(255,255,255,.48);font-size:.72rem;line-height:1.35;margin-top:5px;}
      #utsuroba-reading-challenge .reading-interaction{margin-top:14px;padding:12px;border:1px solid rgba(255,203,117,.24);border-radius:10px;background:rgba(255,203,117,.045);}
      #utsuroba-reading-challenge .reading-interaction-instruction{margin:0 0 10px;color:#ffe0a0;font-size:.78rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-interaction-instruction small{display:block;margin-top:3px;color:rgba(255,231,178,.58);font-size:.9em;}
      #utsuroba-reading-challenge .reading-sequence-picked{min-height:34px;margin-bottom:10px;padding:7px 9px;border-radius:7px;background:rgba(0,0,0,.2);color:rgba(255,255,255,.62);font-size:.75rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-sequence-picked strong{color:#fff0c9;}
      #utsuroba-reading-challenge .reading-sequence-options{display:grid;gap:7px;}
      #utsuroba-reading-challenge .reading-task-choice,#utsuroba-reading-challenge .reading-line-choice{width:100%;text-align:left;padding:9px 10px;border:1px solid rgba(216,168,255,.32);border-radius:7px;background:rgba(255,255,255,.055);color:#fff;cursor:pointer;font:inherit;line-height:1.35;transition:background .15s,border-color .15s,transform .15s;}
      #utsuroba-reading-challenge .reading-task-choice:hover,#utsuroba-reading-challenge .reading-line-choice:hover{background:rgba(216,168,255,.14);border-color:#d8a8ff;transform:translateX(2px);}
      #utsuroba-reading-challenge .reading-task-choice small{display:block;margin-top:3px;color:rgba(255,255,255,.48);font-size:.72rem;}
      #utsuroba-reading-challenge .reading-line-choice{display:block;margin-top:7px;border-left:3px solid rgba(216,168,255,.5);}
      #utsuroba-reading-challenge .reading-line-choice .line-speaker{display:block;color:#d8a8ff;font-size:.7rem;font-weight:700;letter-spacing:.04em;}
      #utsuroba-reading-challenge .reading-line-choice .line-text{display:block;margin-top:2px;color:#fff;font-size:.82rem;}
      #utsuroba-reading-challenge .reading-sequence-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;}
      #utsuroba-reading-challenge .reading-task-action{padding:7px 11px;border:1px solid rgba(216,168,255,.4);border-radius:6px;background:rgba(216,168,255,.08);color:#f3ddff;cursor:pointer;font:700 .72rem Georgia,serif;}
      #utsuroba-reading-challenge .reading-task-action.primary{border-color:#ffcb75;background:rgba(255,203,117,.12);color:#ffe7b2;}
      #utsuroba-reading-challenge .reading-task-action:hover,#utsuroba-reading-challenge .reading-task-action:focus-visible{background:rgba(216,168,255,.2);outline:none;}
      #utsuroba-reading-challenge .reading-task-action.primary:hover{background:rgba(255,203,117,.22);}
      #utsuroba-reading-challenge .reading-picked-answer{margin:0 0 10px;padding:8px 10px;border-left:3px solid #ffcb75;background:rgba(255,203,117,.08);color:#ffe7b2;font-size:.8rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-picked-answer small{display:block;margin-top:3px;color:rgba(255,231,178,.58);font-size:.9em;}
      #utsuroba-reading-challenge .reading-feedback{margin-top:12px;padding:10px 12px;border-left:3px solid #ffcb75;background:rgba(255,203,117,.08);color:#ffe7b2;font-size:.82rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-feedback small{display:block;color:rgba(255,231,178,.68);margin-top:3px;font-size:.9em;}
      #utsuroba-reading-challenge .reading-evidence-btn{display:block;margin-top:8px;padding:6px 10px;border:1px solid rgba(255,203,117,.48);border-radius:6px;background:rgba(255,203,117,.08);color:#ffe7b2;cursor:pointer;font:700 .72rem Georgia,serif;}
      #utsuroba-reading-challenge .reading-evidence-btn:hover,#utsuroba-reading-challenge .reading-evidence-btn:focus-visible{background:rgba(255,203,117,.18);outline:none;}
      #utsuroba-reading-challenge .reading-progress{margin-top:14px;text-align:right;color:rgba(255,255,255,.42);font:700 11px monospace;}
      #utsuroba-reading-challenge .reading-progress small{display:block;margin-top:3px;color:rgba(255,255,255,.3);font-size:.9em;font-weight:400;}
      #utsuroba-reading-challenge .reading-mechanic{margin:18px 0 20px;padding:13px 14px 15px;background:rgba(255,255,255,.035);border:1px solid rgba(255,203,117,.22);border-radius:12px;}
      #utsuroba-reading-challenge .reading-mechanic-heading{display:flex;justify-content:space-between;gap:12px;color:#ffdf9b;font:700 10px/1.4 monospace;letter-spacing:.14em;text-transform:uppercase;}
      #utsuroba-reading-challenge .reading-mechanic-heading span{color:rgba(255,223,155,.58);font-weight:400;letter-spacing:.04em;text-transform:none;}
      #utsuroba-reading-challenge .reading-mechanic-intro{margin:6px 0 2px;color:#fff4d7;font-size:.8rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-mechanic-intro-jp{margin:0;color:rgba(255,231,178,.58);font-size:.7rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-theatre-stage,#utsuroba-reading-challenge .reading-mechanic-board{position:relative;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:13px;padding:12px 8px 8px;overflow:hidden;border:1px solid rgba(216,168,255,.18);border-radius:9px;background:radial-gradient(circle at 50% 0%,rgba(255,213,111,.18),transparent 42%),linear-gradient(180deg,#211832,#0d0916);}
      #utsuroba-reading-challenge .reading-mechanic-evidence-board{background:linear-gradient(160deg,rgba(102,179,255,.12),transparent 45%),linear-gradient(180deg,#152238,#0b1019);}
      #utsuroba-reading-challenge .reading-mechanic-emotion-thread{background:linear-gradient(160deg,rgba(255,145,175,.13),transparent 45%),linear-gradient(180deg,#281a2b,#100c16);}
      #utsuroba-reading-challenge .reading-theatre-stage::before{content:"";position:absolute;left:50%;top:0;width:2px;height:100%;background:linear-gradient(180deg,rgba(255,223,155,.55),transparent 70%);box-shadow:0 0 22px 9px rgba(255,203,117,.09);transform:translateX(-50%);pointer-events:none;}
      #utsuroba-reading-challenge .reading-theatre-act{position:relative;z-index:1;min-height:92px;padding:10px 8px;border:1px solid rgba(255,255,255,.1);border-radius:7px;background:rgba(0,0,0,.22);opacity:.48;transition:all .28s ease;box-sizing:border-box;}
      #utsuroba-reading-challenge .reading-theatre-act.is-current{opacity:1;border-color:rgba(255,203,117,.72);background:rgba(255,203,117,.1);box-shadow:0 0 18px rgba(255,203,117,.12);animation:readingActPulse 1.8s ease-in-out infinite;}
      #utsuroba-reading-challenge .reading-theatre-act.is-restored{opacity:1;border-color:rgba(216,168,255,.62);background:rgba(216,168,255,.1);}
      #utsuroba-reading-challenge .reading-theatre-act.is-restored::after{content:"✓";position:absolute;right:7px;top:5px;color:#ffe39c;font-weight:700;}
      #utsuroba-reading-challenge .reading-theatre-act .act-number{color:#ffcb75;font:700 .68rem monospace;letter-spacing:.1em;}
      #utsuroba-reading-challenge .reading-theatre-act .act-title{display:block;margin-top:7px;color:#fff;font-size:.78rem;line-height:1.25;}
      #utsuroba-reading-challenge .reading-theatre-act .act-title-jp{display:block;margin-top:3px;color:rgba(255,231,178,.55);font-size:.66rem;line-height:1.25;}
      #utsuroba-reading-challenge .reading-theatre-act .act-caption{display:block;margin-top:8px;color:rgba(255,255,255,.76);font-size:.68rem;line-height:1.3;}
      #utsuroba-reading-challenge .reading-theatre-act .act-caption-jp{display:block;margin-top:2px;color:rgba(255,231,178,.46);font-size:.61rem;line-height:1.3;}
      #utsuroba-reading-challenge .reading-theatre-locked{margin:8px 0 0;color:rgba(255,255,255,.34);font-size:.67rem;line-height:1.3;}
      #utsuroba-reading-challenge .reading-theatre-status{margin:8px 0 0;text-align:center;color:#ffdf9b;font-size:.72rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-theatre-status small{display:block;color:rgba(255,231,178,.54);font-size:.9em;}
      @keyframes readingActPulse{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
      @keyframes readingEvidenceIn{from{opacity:.45;transform:translateX(-4px)}to{opacity:1;transform:translateX(0)}}
      #utsuroba-reading-challenge .reading-complete{text-align:center;padding:clamp(36px,8vw,82px) clamp(20px,6vw,80px);}
      #utsuroba-reading-challenge .reading-success{color:#ffe8a8;font-size:clamp(1rem,2.5vw,1.35rem);line-height:1.5;margin:22px auto 4px;max-width:650px;}
      #utsuroba-reading-challenge .reading-primary{margin-top:24px;padding:12px 24px;border:1px solid #ffcb75;border-radius:8px;background:linear-gradient(135deg,#ffe7a8,#c78b31);color:#241507;font:700 .9rem Georgia,serif;cursor:pointer;}
      #utsuroba-reading-challenge .reading-secondary{margin-top:24px;padding:11px 20px;border:1px solid rgba(216,168,255,.55);border-radius:8px;background:rgba(216,168,255,.08);color:#f3ddff;font:700 .86rem Georgia,serif;cursor:pointer;}
      #utsuroba-reading-challenge .reading-secondary:hover{background:rgba(216,168,255,.18);border-color:#d8a8ff;}
      #utsuroba-reading-challenge .reading-complete-actions{display:flex;justify-content:center;gap:10px;flex-wrap:wrap;}
      #utsuroba-reading-challenge .reading-postcard{margin:18px 0;padding:13px;text-align:left;border:1px solid rgba(216,168,255,.28);border-radius:10px;background:rgba(216,168,255,.045);}
      #utsuroba-reading-challenge .reading-postcard-heading{color:#e4c2ff;font:700 .78rem Georgia,serif;}
      #utsuroba-reading-challenge .reading-postcard-heading span{display:block;margin-top:3px;color:rgba(245,232,255,.5);font-size:.88em;font-weight:400;}
      #utsuroba-reading-challenge .reading-postcard-instruction{margin:8px 0;color:rgba(245,232,255,.7);font-size:.74rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-postcard-instruction small{display:block;margin-top:3px;color:rgba(245,232,255,.48);font-size:.9em;}
      #utsuroba-reading-challenge .reading-postcard-picked{min-height:34px;margin-bottom:9px;padding:7px 9px;border-radius:7px;background:rgba(0,0,0,.2);color:rgba(255,255,255,.68);font-size:.74rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-postcard-option{display:block;width:100%;margin-top:7px;padding:8px 9px;text-align:left;border:1px solid rgba(216,168,255,.3);border-radius:6px;background:rgba(255,255,255,.05);color:#fff;cursor:pointer;font:inherit;font-size:.75rem;line-height:1.35;}
      #utsuroba-reading-challenge .reading-postcard-option:hover,#utsuroba-reading-challenge .reading-postcard-option:focus-visible{background:rgba(216,168,255,.14);border-color:#d8a8ff;outline:none;}
      #utsuroba-reading-challenge .reading-postcard-option small{display:block;margin-top:3px;color:rgba(255,255,255,.48);font-size:.9em;}
      #utsuroba-reading-challenge .reading-postcard-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px;}
      #utsuroba-reading-challenge .reading-postcard-save{padding:7px 11px;border:1px solid #ffcb75;border-radius:6px;background:rgba(255,203,117,.12);color:#ffe7b2;cursor:pointer;font:700 .72rem Georgia,serif;}
      #utsuroba-reading-challenge .reading-postcard-save:hover,#utsuroba-reading-challenge .reading-postcard-save:focus-visible{background:rgba(255,203,117,.22);outline:none;}
      #utsuroba-reading-challenge .reading-postcard-success{padding:8px 9px;border-left:3px solid #ffcb75;color:#ffe7b2;font-size:.76rem;line-height:1.45;}
      #utsuroba-reading-challenge .reading-postcard-success small{display:block;margin-top:3px;color:rgba(255,231,178,.58);font-size:.9em;}
      #utsuroba-reading-challenge .reading-review-note{margin:14px auto 0;color:rgba(245,232,255,.48);font-size:.72rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-lens{margin:18px 0 0;padding:13px;text-align:left;border:1px solid rgba(216,168,255,.24);border-radius:10px;background:rgba(216,168,255,.045);}
      #utsuroba-reading-challenge .reading-lens-heading{margin:0;color:#e4c2ff;font:700 .78rem Georgia,serif;line-height:1.4;}
      #utsuroba-reading-challenge .reading-lens-heading small{display:block;margin-top:3px;color:rgba(245,232,255,.52);font-size:.88em;font-weight:400;}
      #utsuroba-reading-challenge .reading-lens-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:10px;}
      #utsuroba-reading-challenge .reading-lens-option{padding:8px 9px;text-align:left;border:1px solid rgba(216,168,255,.3);border-radius:7px;background:rgba(255,255,255,.05);color:#fff;cursor:pointer;font:700 .7rem Georgia,serif;line-height:1.3;}
      #utsuroba-reading-challenge .reading-lens-option:hover,#utsuroba-reading-challenge .reading-lens-option:focus-visible{background:rgba(216,168,255,.14);border-color:#d8a8ff;outline:none;}
      #utsuroba-reading-challenge .reading-lens-option small{display:block;margin-top:3px;color:rgba(255,255,255,.5);font-size:.86em;font-weight:400;}
      #utsuroba-reading-challenge .reading-onboarding{text-align:left;padding:clamp(24px,5vw,46px);}
      #utsuroba-reading-challenge .reading-onboarding-intro{margin:0 0 18px;color:#f5e8ff;font-size:.9rem;line-height:1.5;}
      #utsuroba-reading-challenge .reading-onboarding-intro small{display:block;margin-top:3px;color:rgba(245,232,255,.54);font-size:.84em;}
      #utsuroba-reading-challenge .reading-onboarding-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:0 0 20px;}
      #utsuroba-reading-challenge .reading-onboarding-step{padding:11px 10px;border:1px solid rgba(216,168,255,.24);border-radius:9px;background:rgba(255,255,255,.045);}
      #utsuroba-reading-challenge .reading-onboarding-step b{display:block;color:#ffcb75;font:700 .7rem monospace;letter-spacing:.1em;}
      #utsuroba-reading-challenge .reading-onboarding-step strong{display:block;margin-top:6px;color:#fff;font-size:.76rem;line-height:1.3;}
      #utsuroba-reading-challenge .reading-onboarding-step small{display:block;margin-top:4px;color:rgba(255,231,178,.58);font-size:.68rem;line-height:1.35;}
      #utsuroba-reading-challenge .reading-calibration{padding:13px;border:1px solid rgba(255,203,117,.27);border-radius:10px;background:rgba(255,203,117,.045);}
      #utsuroba-reading-challenge .reading-calibration-heading{margin:0;color:#ffe0a0;font-size:.8rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-calibration-heading small{display:block;margin-top:3px;color:rgba(255,231,178,.58);font-size:.88em;}
      #utsuroba-reading-challenge .reading-calibration-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:11px;}
      #utsuroba-reading-challenge .reading-calibration-option{min-height:78px;padding:10px;text-align:left;border:1px solid rgba(216,168,255,.34);border-radius:8px;background:rgba(255,255,255,.055);color:#fff;cursor:pointer;font:inherit;line-height:1.35;}
      #utsuroba-reading-challenge .reading-calibration-option:hover,#utsuroba-reading-challenge .reading-calibration-option:focus-visible{background:rgba(216,168,255,.15);border-color:#d8a8ff;outline:none;}
      #utsuroba-reading-challenge .reading-calibration-option strong{display:block;color:#fff0c9;font-size:.8rem;}
      #utsuroba-reading-challenge .reading-calibration-option small{display:block;margin-top:5px;color:rgba(255,255,255,.55);font-size:.72rem;line-height:1.35;}
      #utsuroba-reading-challenge .reading-onboarding-note{margin:13px 0 0;color:rgba(245,232,255,.5);font-size:.7rem;line-height:1.4;}
      #utsuroba-reading-challenge .reading-loading{text-align:center;padding:80px 24px;color:#f1dcff;}
      @media(max-width:700px){#utsuroba-reading-challenge{padding:10px;}#utsuroba-reading-challenge .reading-choices{grid-template-columns:1fr;}#utsuroba-reading-challenge .reading-onboarding-steps,.reading-calibration-options,.reading-lens-options{grid-template-columns:1fr;}#utsuroba-reading-challenge .reading-card{max-height:calc(100vh - 20px);padding:20px 16px;}#utsuroba-reading-challenge .reading-close{min-width:44px;min-height:44px;}}
      @media(max-height:520px) and (orientation:landscape){#utsuroba-reading-challenge{align-items:flex-start;padding:8px;}#utsuroba-reading-challenge .reading-card{max-height:calc(100vh - 16px);padding:16px 18px;}}
      @media(prefers-reduced-motion:reduce){#utsuroba-reading-challenge *,#utsuroba-reading-challenge *::before,#utsuroba-reading-challenge *::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;scroll-behavior:auto !important;transition-duration:.01ms !important;}}
    `;
    document.head.appendChild(style);
  }

  function close() {
    const callback = closeCallback;
    closeCallback = null;
    open = false;
    if (overlay) overlay.remove();
    if (style) style.remove();
    overlay = null;
    style = null;
    if (callback) callback();
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
    previousFocus = null;
  }

  async function start(options) {
    const opts = options || {};
    if (open) close();
    previousFocus = document.activeElement;
    closeCallback = typeof opts.onClose === 'function' ? opts.onClose : null;
    open = true;
    installStyle();

    overlay = document.createElement('div');
    overlay.id = 'utsuroba-reading-challenge';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Reading memory');
    overlay.tabIndex = -1;
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9600;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(4,0,12,.90);font-family:Georgia,serif;color:#f7f2e8;';
    overlay.innerHTML = '<div class="reading-card reading-loading">Opening the memory…<br><span>記憶を開いています…</span></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      trapFocus(event);
    });

    let episode;
    try {
      await window.UTSUROBA_EPISODES_READY;
      episode = window.UTSUROBA_EPISODES[opts.quest && opts.quest.episodeId];
      if (!episode) throw new Error(`Unknown episode: ${opts.quest && opts.quest.episodeId}`);
    } catch (error) {
      console.error('[Utsuroba Reading] Could not open episode:', error);
      overlay.innerHTML = '<div class="reading-card reading-loading">This memory is cloudy. Please try again.<br><span>記憶がぼやけています。もう一度試してください。</span><br><button class="reading-primary" id="reading-error-close">Close / 閉じる</button></div>';
      overlay.querySelector('#reading-error-close').addEventListener('click', close);
      focusFirstControl();
      return false;
    }

    const replayLens = opts.reviewLens && episode.replayLenses?.[opts.reviewLens]
      ? episode.replayLenses[opts.reviewLens] : null;
    const questions = replayLens ? [replayLens] : episode.checks;
    let questionIndex = replayLens ? 0 : (Number.isInteger(opts.quest && opts.quest.readingIndex)
      ? opts.quest.readingIndex : 0);
    const mechanic = episode.mechanic || null;
    let mechanicIndex = mechanic && Number.isInteger(opts.quest && opts.quest.mechanicIndex)
      ? opts.quest.mechanicIndex
      : (mechanic && Number.isInteger(opts.quest && opts.quest.theatreIndex)
        ? opts.quest.theatreIndex : questionIndex);
    let lastFeedback = '';
    let lastFeedbackJP = '';
    let showEvidence = false;
    let sequenceSelection = [];
    let inferenceAnswerChosen = false;
    let supportLevel = opts.adaptiveMode === 'independent' ? 'independent' : 'guided';
    const onboardingState = opts.onboarding || {};
    const needsOnboarding = !opts.reviewOnly && !opts.skipOnboarding && onboardingState.seen !== true;
    let mistakeCount = 0;
    let usedEvidence = false;
    let postcardOpen = false;
    let postcardSelection = [];
    let postcardBuilt = false;
    let postcardSaved = !!(opts.quest && opts.quest.postcard && opts.quest.postcard.text);
    let postcardFeedback = '';

    function reviewModeLabel() {
      if (replayLens) return `${replayLens.label} / ${replayLens.labelJP}`;
      if (supportLevel === 'independent') return 'INDEPENDENT REVIEW / 自力復習';
      return 'GUIDED REVIEW / 案内付き復習';
    }

    function renderLensReplay() {
      if (!opts.reviewOnly || replayLens || !episode.replayLenses) return '';
      return `<section class="reading-lens"><p class="reading-lens-heading">Choose a replay lens.<small>読み返す視点を選びましょう。</small></p><div class="reading-lens-options"><button class="reading-lens-option" type="button" data-reading-lens="detail">Detail Hunt<small>細部ハント</small></button><button class="reading-lens-option" type="button" data-reading-lens="emotion">Emotion Hunt<small>気持ちハント</small></button><button class="reading-lens-option" type="button" data-reading-lens="inference">Inference Hunt<small>推測ハント</small></button></div></section>`;
    }

    function startLensReplay(lens) {
      if (!episode.replayLenses?.[lens]) return;
      if (typeof opts.onReadingEvent === 'function') opts.onReadingEvent('lens');
      start({
        ...opts,
        reviewLens: lens,
        skipOnboarding: true,
        quest: { ...(opts.quest || {}), readingIndex: 0, mechanicIndex: 0 }
      });
    }

    function renderOnboarding() {
      overlay.innerHTML = `
        <div class="reading-card reading-onboarding">
          <button class="reading-close" id="reading-onboarding-close" type="button" aria-label="Close reading guide">✕</button>
          <div class="reading-eyebrow">READING MAP / 読み方</div>
          <h2>How to read a memory <span>記憶の読み方</span></h2>
          <p class="reading-onboarding-intro">Read the English lines, use help when you need it, and choose answers from the evidence.<small>英語の文を読み、必要なときにヘルプを使い、手がかりから答えを選びます。</small></p>
          <div class="reading-onboarding-steps">
            <article class="reading-onboarding-step"><b>STEP 1</b><strong>Read the lines.</strong><small>文を読みます。</small></article>
            <article class="reading-onboarding-step"><b>STEP 2</b><strong>Notice the details.</strong><small>細かい点に気づきます。</small></article>
            <article class="reading-onboarding-step"><b>STEP 3</b><strong>Show your evidence.</strong><small>証拠を示します。</small></article>
          </div>
          <section class="reading-calibration">
            <p class="reading-calibration-heading">Choose your first reading style.<small>最初の読み方を選びましょう。</small></p>
            <div class="reading-calibration-options">
              <button class="reading-calibration-option" type="button" data-reading-calibration="guided"><strong>Guided</strong><small>Show evidence after a mistake. Good when you want support.<br>間違えたら証拠を見ます。サポートがほしい人向けです。</small></button>
              <button class="reading-calibration-option" type="button" data-reading-calibration="independent"><strong>Try first</strong><small>Try without evidence at first. Good when you want a challenge.<br>最初は証拠を見ずに挑戦します。挑戦したい人向けです。</small></button>
            </div>
          </section>
          <p class="reading-onboarding-note">You can still ask for evidence after two mistakes.<br>二回間違えたら、証拠を見ることができます。</p>
        </div>`;
      overlay.querySelector('#reading-onboarding-close').addEventListener('click', close);
      overlay.querySelectorAll('[data-reading-calibration]').forEach(button => button.addEventListener('click', () => {
        supportLevel = button.dataset.readingCalibration === 'independent' ? 'independent' : 'guided';
        if (typeof opts.persistOnboarding === 'function') {
          opts.persistOnboarding({ seen: true, calibration: supportLevel });
        }
        render();
      }));
      focusFirstControl();
    }

    function renderVocabulary() {
      if (!Array.isArray(episode.vocabulary) || !episode.vocabulary.length) return '';
      const words = episode.vocabulary.map((item, index) => `
        <button class="reading-vocab-word" type="button" data-vocab="${index}">${escapeText(item.word)}</button>`).join('');
      const summary = supportLevel === 'independent'
        ? 'Word help is optional. Try to remember first. / まず思い出してから、言葉のヘルプを使いましょう。'
        : 'Tap a word for a simple meaning. / 言葉をタップすると意味が出ます。';
      return `
        <details class="reading-vocab" id="reading-vocabulary">
          <summary>Word help / 言葉のヘルプ<span>${summary}</span></summary>
          <div class="reading-vocab-body">
            <div class="reading-vocab-list">${words}</div>
            <div class="reading-vocab-detail" id="reading-vocab-detail">Choose a word to see help.<small>言葉を一つ選んでください。</small></div>
          </div>
        </details>`;
    }

    function bindVocabulary() {
      const vocabulary = overlay.querySelector('#reading-vocabulary');
      if (!vocabulary || !Array.isArray(episode.vocabulary)) return;
      const detail = vocabulary.querySelector('#reading-vocab-detail');
      vocabulary.querySelectorAll('[data-vocab]').forEach(button => {
        button.addEventListener('click', () => {
          const item = episode.vocabulary[Number(button.dataset.vocab)];
          if (!item || !detail) return;
          detail.innerHTML = `<strong>${escapeText(item.word)}</strong> — ${escapeText(item.definition)}<small>${escapeText(item.definitionJP)}</small>`;
        });
      });
    }

    function renderMechanic(restoredCount) {
      if (!mechanic) return '';
      const items = mechanic.acts || mechanic.items || mechanic.beats || [];
      if (!items.length) return '';
      const className = mechanic.type === 'memory-theatre'
        ? 'reading-theatre-stage'
        : `reading-mechanic-board reading-mechanic-${escapeText(mechanic.type)}`;
      const cards = items.map((item, index) => {
        const state = index < restoredCount ? 'is-restored' : (index === restoredCount ? 'is-current' : 'is-locked');
        const locked = index > restoredCount;
        const numberLabel = mechanic.type === 'memory-theatre' ? 'ACT' : (mechanic.type === 'evidence-board' ? 'CLUE' : 'BEAT');
        return `
          <div class="reading-theatre-act ${state}">
            <span class="act-number">${numberLabel} ${String(index + 1).padStart(2, '0')}</span>
            <span class="act-title">${escapeText(item.title)}</span>
            <span class="act-title-jp">${escapeText(item.titleJP)}</span>
            ${locked
              ? '<span class="reading-theatre-locked">Answer the next question to reveal this piece.<br>次の問題に答えると手がかりが現れます。</span>'
              : `<span class="act-caption">${escapeText(item.caption)}</span><span class="act-caption-jp">${escapeText(item.captionJP)}</span>`}
          </div>`;
      }).join('');
      const complete = restoredCount >= items.length;
      const statusJP = complete ? mechanic.completeJP : `${restoredCount} / ${items.length} 発見`;
      const statusEN = complete ? mechanic.complete : `${restoredCount} / ${items.length} ${mechanic.type === 'memory-theatre' ? 'acts restored' : 'pieces revealed'}`;
      return `
        <section class="reading-mechanic" aria-label="${escapeText(mechanic.name)}">
          <div class="reading-mechanic-heading">${escapeText(mechanic.name)} <span>${escapeText(mechanic.nameJP)}</span></div>
          <p class="reading-mechanic-intro">${escapeText(mechanic.instruction)}</p>
          <p class="reading-mechanic-intro-jp">${escapeText(mechanic.instructionJP)}</p>
          <div class="${className}">${cards}</div>
          <div class="reading-theatre-status">${escapeText(statusEN)}<small>${escapeText(statusJP)}</small></div>
        </section>`;
    }

    function renderPostcard() {
      const postcard = episode.postcard;
      if (!postcard || replayLens) return '';
      if (!postcardOpen) {
        return `<section class="reading-postcard"><div class="reading-postcard-heading">${escapeText(postcard.title)}<span>${escapeText(postcard.titleJP)}</span></div><button class="reading-secondary" id="reading-postcard-open" type="button">Write a postcard / 文章カードを書く</button></section>`;
      }
      if (postcardSaved) {
        return `<section class="reading-postcard"><div class="reading-postcard-success"><strong>Postcard saved.</strong> You can read it again in your Journal.<small>保存しました。Journalで読み返せます。</small></div></section>`;
      }
      if (postcardBuilt) {
        const text = postcardSelection.map(index => postcard.chunks[index]).join(' ');
        return `<section class="reading-postcard"><div class="reading-postcard-heading">${escapeText(postcard.title)}<span>${escapeText(postcard.titleJP)}</span></div><p class="reading-postcard-instruction">Your postcard:<small>あなたの文章カード：</small></p><div class="reading-postcard-picked">${escapeText(text)}</div><div class="reading-postcard-actions"><button class="reading-postcard-save" id="reading-postcard-save" type="button">Save postcard / 保存する</button><button class="reading-task-action" id="reading-postcard-reset" type="button">Try again / もう一度</button></div></section>`;
      }
      const chunks = postcard.chunks.map((chunk, index) => postcardSelection.includes(index) ? '' : `<button class="reading-postcard-option" type="button" data-postcard-chunk="${index}">${escapeText(chunk)}<small>${escapeText(postcard.chunksJP[index] || '')}</small></button>`).join('');
      const picked = postcardSelection.length
        ? postcardSelection.map((index, order) => `<strong>${order + 1}.</strong> ${escapeText(postcard.chunks[index])}`).join('<br>')
        : 'Your summary will appear here.';
      return `<section class="reading-postcard"><div class="reading-postcard-heading">${escapeText(postcard.title)}<span>${escapeText(postcard.titleJP)}</span></div><p class="reading-postcard-instruction">${escapeText(postcard.instruction)}<small>${escapeText(postcard.instructionJP)}</small></p>${postcardFeedback ? `<div class="reading-postcard-success">${postcardFeedback}</div>` : ''}<div class="reading-postcard-picked">${picked}</div><div class="reading-postcard-options">${chunks || '<span style="color:rgba(255,255,255,.55);font-size:.74rem;">All pieces selected. Check your summary.</span>'}</div><div class="reading-postcard-actions"><button class="reading-task-action" id="reading-postcard-reset" type="button">Start over / 最初から</button><button class="reading-task-action primary" id="reading-postcard-check" type="button">Check summary / まとめを確認</button></div></section>`;
    }

    function savePostcard() {
      const postcard = episode.postcard;
      if (!postcard || !postcardSaved) {
        const payload = { text: postcardSelection.map(index => postcard.chunks[index]).join(' '), savedAt: Date.now() };
        if (opts.persist) opts.persist({ postcard: payload });
        if (typeof opts.onPostcardSave === 'function') opts.onPostcardSave(payload);
        postcardSaved = true;
      }
      render();
    }

    const finish = () => {
      if (opts.reviewOnly) {
        if (typeof opts.onReviewComplete === 'function') {
          opts.onReviewComplete({
            supportLevel,
            mistakes: mistakeCount,
            usedEvidence,
            totalQuestions: questions.length,
          });
        }
        close();
        return;
      }
      const onComplete = opts.onComplete;
      close();
      if (onComplete) onComplete();
    };

    const review = () => {
      questionIndex = 0;
      mechanicIndex = 0;
      lastFeedback = '';
      lastFeedbackJP = '';
      sequenceSelection = [];
      inferenceAnswerChosen = false;
      mistakeCount = 0;
      usedEvidence = false;
      postcardOpen = false;
      postcardSelection = [];
      postcardBuilt = false;
      postcardFeedback = '';
      if (opts.persist) {
        const progress = { state: 'reading', readingState: 'review', readingIndex: 0, mechanicIndex: 0 };
        if (mechanic && mechanic.type === 'memory-theatre') progress.theatreIndex = 0;
        opts.persist(progress);
      }
      render();
    };

    function resetQuestionInteraction() {
      sequenceSelection = [];
      inferenceAnswerChosen = false;
    }

    function renderLineChoices(question, mode) {
      const selectedLine = mode === 'inference' ? question.supportingLine : question.matchLine;
      const instruction = mode === 'inference'
        ? 'Now choose the line that proves your idea.'
        : 'Tap the exact line that contains the answer.';
      const instructionJP = mode === 'inference'
        ? '次に、考えを証明する行を選びましょう。'
        : '答えが書かれている行をタップしましょう。';
      const lines = episode.lines.map((line, index) => `
        <button class="reading-line-choice" type="button" data-line-choice="${index}">
          <span class="line-speaker">${escapeText(line.speaker)}</span>
          <span class="line-text">${escapeText(line.en)}</span>
        </button>`).join('');
      return `<div class="reading-interaction reading-line-interaction" data-correct-line="${Number.isInteger(selectedLine) ? selectedLine : -1}">
        <p class="reading-interaction-instruction">${instruction}<small>${instructionJP}</small></p>
        <div class="reading-line-choices">${lines}</div>
      </div>`;
    }

    function renderInteraction(question) {
      if (question.type === 'sequence') {
        const choices = question.choices.map((choice, index) => {
          if (sequenceSelection.includes(index)) return '';
          return `<button class="reading-task-choice" type="button" data-sequence-choice="${index}"><span>${escapeText(choice)}</span><small>${escapeText(question.choicesJP[index] || '')}</small></button>`;
        }).join('');
        const picked = sequenceSelection.length
          ? sequenceSelection.map((index, order) => `<strong>${order + 1}.</strong> ${escapeText(question.choices[index])}`).join('<br>')
          : 'Your order will appear here.';
        return `<div class="reading-interaction reading-sequence-interaction">
          <p class="reading-interaction-instruction">Tap each event in the order it happened.<small>出来事が起きた順番にタップしましょう。</small></p>
          <div class="reading-sequence-picked">${picked}</div>
          <div class="reading-sequence-options">${choices || '<span style="color:rgba(255,255,255,.55);font-size:.75rem;">All events selected. Check your order.</span>'}</div>
          <div class="reading-sequence-actions"><button class="reading-task-action" type="button" id="reading-sequence-reset">Start over / 最初から</button><button class="reading-task-action primary" type="button" id="reading-sequence-submit">Check order / 順番を確認</button></div>
        </div>`;
      }
      if (question.type === 'detail') return renderLineChoices(question, 'detail');
      if (question.type === 'inference') {
        if (!inferenceAnswerChosen) {
          const choices = question.choices.map((choice, index) => `<button class="reading-task-choice" type="button" data-inference-choice="${index}"><span>${escapeText(choice)}</span><small>${escapeText(question.choicesJP[index] || '')}</small></button>`).join('');
          return `<div class="reading-interaction reading-inference-interaction"><p class="reading-interaction-instruction">Choose the meaning you infer from the conversation.<small>会話から分かる意味を選びましょう。</small></p><div class="reading-sequence-options">${choices}</div></div>`;
        }
        const chosen = question.choices[question.correct];
        return `<div class="reading-interaction reading-inference-interaction"><p class="reading-picked-answer">Your idea: ${escapeText(chosen)}<small>あなたの考え：${escapeText(question.choicesJP[question.correct] || '')}</small></p>${renderLineChoices(question, 'inference')}</div>`;
      }
      const choices = question.choices.map((choice, i) => `<button class="reading-choice" data-choice="${i}"><span>${escapeText(choice)}</span><small>${escapeText(question.choicesJP[i] || '')}</small></button>`).join('');
      return `<div class="reading-choices">${choices}</div>`;
    }

    function advanceQuestion(question) {
      questionIndex += 1;
      showEvidence = false;
      resetQuestionInteraction();
      if (mechanic && question.revealAct != null) {
        mechanicIndex = Math.max(mechanicIndex, question.revealAct + 1);
        lastFeedback = question.restoreText || 'The scene returns.';
        lastFeedbackJP = question.restoreTextJP || '場面が戻ります。';
      } else {
        lastFeedback = '';
        lastFeedbackJP = '';
      }
      if (opts.persist) {
        const progress = { readingIndex: questionIndex, mechanicIndex };
        if (mechanic && mechanic.type === 'memory-theatre') progress.theatreIndex = mechanicIndex;
        opts.persist(progress);
      }
      render();
    }

    function showWrong(question) {
      mistakeCount += 1;
      showEvidence = false;
      lastFeedback = `Not quite. Look again at the lines. ${question.evidence}`;
      lastFeedbackJP = question.evidenceJP || 'もう一度、会話を読み直しましょう。';
      setTimeout(render, 320);
    }

    const render = () => {
      const question = questions[questionIndex];
      const evidenceLines = question && Array.isArray(question.evidenceLines) ? question.evidenceLines : [];
      const lines = episode.lines.map((line, lineIndex) => `
        <div class="reading-line${showEvidence && evidenceLines.includes(lineIndex) ? ' is-evidence' : ''}" data-line-index="${lineIndex}">
          <div class="reading-speaker">${escapeText(line.speaker)}</div>
          <div class="reading-en">${escapeText(line.en)}</div>
        </div>`).join('');

      if (!question) {
        const modeLabel = opts.reviewOnly
          ? reviewModeLabel()
          : 'FIRST READING / はじめての読書';
        const reviewResult = opts.reviewOnly
          ? `${mistakeCount === 0 && !usedEvidence ? 'Clean recall.' : 'Support was available when you needed it.'}<small>${mistakeCount === 0 && !usedEvidence ? 'ヒントなしで思い出せました。' : '必要なときにサポートを使いました。'}</small>`
          : '';
        const completeActions = opts.reviewOnly
          ? `<button class="reading-secondary" id="reading-review-btn">Read again / もう一度読む</button><button class="reading-primary" id="reading-return-btn">Close journal review / ノートを閉じる</button>`
          : `<button class="reading-secondary" id="reading-review-btn">Review reading / 読み返す</button><button class="reading-primary" id="reading-return-btn">Restore memory / 記憶を戻す</button>`;
        const completeNote = opts.reviewOnly
          ? 'This is a quiet review. It does not change your quest.<br>これは読み返しです。クエストは変わりません。'
          : 'Review as many times as you like before restoring the memory.<br>記憶を戻す前に、何度でも読み返せます。';
        overlay.innerHTML = `
          <div class="reading-card reading-complete">
            <div class="reading-eyebrow">${escapeText(episode.eyebrow)}</div>
            <div class="reading-support-badge${supportLevel === 'independent' ? ' independent' : ''}">${modeLabel}</div>
            <h2>${escapeText(episode.title)}</h2>
            ${renderVocabulary()}
            ${renderMechanic(mechanic ? (mechanic.acts || mechanic.items || mechanic.beats || []).length : mechanicIndex)}
            <p class="reading-success">${escapeText(episode.success)}</p>
            <p class="reading-jp">${escapeText(episode.successJP)}</p>
            ${reviewResult ? `<p class="reading-review-note">${reviewResult}</p>` : ''}
            ${renderPostcard()}
            ${renderLensReplay()}
            <div class="reading-complete-actions">
              ${completeActions}
            </div>
            <p class="reading-review-note">${completeNote}</p>
          </div>`;
        overlay.querySelector('#reading-return-btn').addEventListener('click', finish);
        overlay.querySelector('#reading-review-btn').addEventListener('click', review);
        overlay.querySelectorAll('[data-reading-lens]').forEach(button => button.addEventListener('click', () => startLensReplay(button.dataset.readingLens)));
        const postcardOpenButton = overlay.querySelector('#reading-postcard-open');
        if (postcardOpenButton) postcardOpenButton.addEventListener('click', () => { postcardOpen = true; render(); });
        overlay.querySelectorAll('[data-postcard-chunk]').forEach(button => button.addEventListener('click', () => {
          const index = Number(button.dataset.postcardChunk);
          if (!postcardSelection.includes(index)) { postcardSelection.push(index); postcardFeedback = ''; render(); }
        }));
        const postcardResetButton = overlay.querySelector('#reading-postcard-reset');
        if (postcardResetButton) postcardResetButton.addEventListener('click', () => { postcardSelection = []; postcardBuilt = false; postcardFeedback = ''; render(); });
        const postcardCheckButton = overlay.querySelector('#reading-postcard-check');
        if (postcardCheckButton) postcardCheckButton.addEventListener('click', () => {
          const postcard = episode.postcard;
          const expected = Array.isArray(postcard?.order) ? postcard.order : [];
          if (postcardSelection.length === expected.length && postcardSelection.every((value, index) => value === expected[index])) {
            postcardBuilt = true;
            postcardFeedback = '<strong>That summary makes sense.</strong><small>このまとめで大丈夫です。</small>';
          } else {
            postcardFeedback = '<strong>Try a different order.</strong> Read the memory once more.<small>別の順番を試しましょう。もう一度記憶を読みましょう。</small>';
          }
          render();
        });
        const postcardSaveButton = overlay.querySelector('#reading-postcard-save');
        if (postcardSaveButton) postcardSaveButton.addEventListener('click', savePostcard);
        bindVocabulary();
        focusFirstControl();
        return;
      }

      overlay.innerHTML = `
        <div class="reading-card">
          <button class="reading-close" id="reading-close-btn">✕</button>
          <div class="reading-eyebrow">${escapeText(episode.eyebrow)}</div>
          <div class="reading-support-badge${supportLevel === 'independent' ? ' independent' : ''}">${opts.reviewOnly ? reviewModeLabel() : 'FIRST READING / はじめての読書'}</div>
          <h2>${escapeText(episode.title)} <span>${escapeText(episode.titleJP)}</span></h2>
          <p class="reading-intro">${escapeText(episode.intro)}</p>
          <p class="reading-jp">${escapeText(episode.introJP)}</p>
          ${renderVocabulary()}
          ${renderMechanic(mechanicIndex)}
          <div class="reading-transcript">${lines}</div>
          <div class="reading-question-label">${escapeText(question.label)} · ${escapeText(question.labelJP)}</div>
          <h3>${escapeText(question.prompt)}</h3>
          <p class="reading-jp">${escapeText(question.promptJP)}</p>
          ${lastFeedback ? `<div class="reading-feedback" role="status" aria-live="polite">${escapeText(lastFeedback)}<small>${escapeText(lastFeedbackJP)}</small>${supportLevel === 'guided' || mistakeCount >= 2 ? '<button class="reading-evidence-btn" id="reading-evidence-btn" type="button">Show evidence / 根拠を見る</button>' : ''}</div>` : ''}
          ${renderInteraction(question)}
          <div class="reading-progress" role="status" aria-live="polite">Question ${questionIndex + 1} of ${questions.length}<small>問題 ${questionIndex + 1} / ${questions.length}</small></div>
        </div>`;

      overlay.querySelector('#reading-close-btn').addEventListener('click', close);
      bindVocabulary();
      const evidenceButton = overlay.querySelector('#reading-evidence-btn');
      if (evidenceButton) evidenceButton.addEventListener('click', () => {
        usedEvidence = true;
        if (typeof opts.onReadingEvent === 'function') opts.onReadingEvent('evidence');
        showEvidence = true;
        render();
        const firstEvidence = overlay.querySelector('.reading-line.is-evidence');
        if (firstEvidence) firstEvidence.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
      overlay.querySelectorAll('[data-sequence-choice]').forEach(button => button.addEventListener('click', () => {
        const choice = Number(button.dataset.sequenceChoice);
        if (!sequenceSelection.includes(choice)) {
          sequenceSelection.push(choice);
          render();
        }
      }));
      const sequenceReset = overlay.querySelector('#reading-sequence-reset');
      if (sequenceReset) sequenceReset.addEventListener('click', () => { sequenceSelection = []; lastFeedback = ''; lastFeedbackJP = ''; render(); });
      const sequenceSubmit = overlay.querySelector('#reading-sequence-submit');
      if (sequenceSubmit) sequenceSubmit.addEventListener('click', () => {
        const expected = Array.isArray(question.sequenceOrder) ? question.sequenceOrder : question.choices.map((_, index) => index);
        if (sequenceSelection.length === expected.length && sequenceSelection.every((value, index) => value === expected[index])) advanceQuestion(question);
        else showWrong(question);
      });
      overlay.querySelectorAll('[data-line-choice]').forEach(button => button.addEventListener('click', () => {
        const lineIndex = Number(button.dataset.lineChoice);
        const expected = question.type === 'inference' ? question.supportingLine : question.matchLine;
        if (lineIndex === expected) advanceQuestion(question);
        else showWrong(question);
      }));
      overlay.querySelectorAll('[data-inference-choice]').forEach(button => button.addEventListener('click', () => {
        const choice = Number(button.dataset.inferenceChoice);
        if (choice === question.correct) {
          inferenceAnswerChosen = true;
          lastFeedback = 'Good. Now prove your idea with a line.';
          lastFeedbackJP = 'いいですね。次に、証拠の行を選びましょう。';
          render();
        } else showWrong(question);
      }));
      overlay.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
        const choice = Number(button.dataset.choice);
        if (choice === question.correct) advanceQuestion(question);
        else showWrong(question);
      }));
      focusFirstControl();
    };

    if (opts.persist) {
      const progress = { state: 'reading', readingState: 'active', readingIndex: questionIndex, mechanicIndex };
      if (mechanic && mechanic.type === 'memory-theatre') progress.theatreIndex = mechanicIndex;
      opts.persist(progress);
    }
    if (needsOnboarding) renderOnboarding();
    else { render(); focusFirstControl(); }
    return true;
  }

  window.UtsurobaReading = {
    start,
    close,
    isOpen: () => open
  };
})();
