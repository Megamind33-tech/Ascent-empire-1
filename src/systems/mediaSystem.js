/**
 * mediaSystem.js — Dynamic Global Media & Sentiment Engine
 * =========================================================
 * Reacts to every eventBus signal and translates it into a 
 * public narrative. The media system directly impacts player 
 * Approval and Legitimacy.
 */

import { on, emit } from './eventBus.js';
import { setMessage } from '../ui/hud.js';
import { openDecision } from '../ui/decisionModal.js';
import { playUIClick } from './audioSystem.js';

const HEADLINE_TYPES = {
  NORMAL: 'normal',
  URGENT: 'urgent',
  CRITICAL: 'critical',
  POSITIVE: 'positive'
};

export function initMediaSystem(state) {
  // Subscribe to core events to generate news
  on('SCANDAL', (payload) => _generateHeadline(state, `INVESTIGATION: ${payload.severity > 0.6 ? 'Shocking' : 'Substantial'} Corruption uncovered in administration.`, HEADLINE_TYPES.CRITICAL));
  on('PROTEST', (payload) => _generateHeadline(state, `UNREST: Protest erupts in ${payload.district}. Citizens demand accountability.`, HEADLINE_TYPES.URGENT));
  on('LAW_PASSED', (payload) => _generateHeadline(state, `LAW: Parliament enacts new legislation. The social contract evolves.`, HEADLINE_TYPES.POSITIVE));
  on('ELECTION_WON', (payload) => _generateHeadline(state, `ELECTION RESULT: Player confirmed as ${payload.office}. A new era begins.`, HEADLINE_TYPES.POSITIVE));
  on('BUILDING_FIRE', () => _generateHeadline(state, `BREAKING: Major fire reported. Emergency services on high alert.`, HEADLINE_TYPES.URGENT));
  on('RIVAL_SETBACK', (payload) => _generateHeadline(state, `POLITICAL UPDATE: ${payload.rivalName} suffers heavy losses in latest polls.`, HEADLINE_TYPES.NORMAL));
  on('FOOD_CRISIS', () => _generateHeadline(state, `URGENT: Food supplies dwindling. Citizens report empty shelves.`, HEADLINE_TYPES.CRITICAL));
}

export function updateMedia(state, dt) {
  // Slowly drift sentiment towards neutral (50)
  if (state.mediaSentiment > 52) state.mediaSentiment -= 0.1 * dt;
  if (state.mediaSentiment < 48) state.mediaSentiment += 0.1 * dt;

  // Sentiment impacts Approval
  const sentimentDelta = (state.mediaSentiment - 50) / 100;
  state.approval += sentimentDelta * dt * 0.5;
}

/** 
 * Open the Press Room overlay (Decision-based for now)
 */
export function openPressRoom(state) {
  openDecision(state, {
    title: 'THE PRESS CENTER',
    description: `Media Sentiment: ${Math.round(state.mediaSentiment)}%. How should we handle the current narrative?`,
    options: [
      {
        label: 'Media Ownership & Buyouts',
        consequenceText: 'Review and acquire national media outlets to control the narrative.',
        action: (gs) => _openOwnershipSubmenu(gs)
      },
      {
        label: 'Spin the News ($4,000)',
        consequenceText: 'Manipulate headlines to hide scandals. Boosts sentiment but costs legitimacy.',
        action: (gs) => {
          if (gs.cash < 4000) return setMessage('Insufficient funds for spin.');
          gs.cash -= 4000;
          gs.mediaSentiment += 15;
          gs.legitimacy -= 5;
          setMessage('Journalists have been "briefed". The outlook is improving.');
        }
      },
      {
        label: 'Direct Subsidies ($10,000)',
        consequenceText: 'Fund state-aligned media expansion. Permanent 0.05/s sentiment boost.',
        action: (gs) => {
          if (gs.cash < 10000) return setMessage('Insufficient funds for subsidies.');
          gs.cash -= 10000;
          gs.activeModifiers.approvalDelta += 0.05; // Using approvalDelta as a proxy for ongoing sentiment weight
          gs.mediaSentiment += 10;
          setMessage('New "State Truth" network launched. Loyalty grows.');
        }
      },
      {
        label: 'Media Freedom Act ($2,000)',
        consequenceText: 'Grant full autonomy. Massive legitimacy boost, but sentiment becomes unpredictable.',
        action: (gs) => {
          gs.cash -= 2000;
          gs.legitimacy += 12;
          gs.mediaSentiment -= 8;
          setMessage('Press freedom guaranteed. The world applauds your transparency.');
        }
      }
    ]
  });
}

function _generateHeadline(state, text, type) {
  // Instead of one global headline, we process it through the lens of biased outlets
  state.mediaHouses.forEach(house => {
    // Probability of reporting depends on reach and type
    if (Math.random() < house.reach + (type === HEADLINE_TYPES.CRITICAL ? 0.3 : 0)) {
      let biasedText = text;
      let impact = 0;

      // Apply bias lens
      // Pro-government bias (positive values) tone down critical news, amplify positive news
      // Opposition bias (negative values) amplify critical news, tone down or ignore positive news
      if (type === HEADLINE_TYPES.CRITICAL) {
        if (house.bias > 0.5) biasedText = `OFFICIAL: Minor irregularities reported in admin. (via ${house.name})`;
        else if (house.bias < -0.5) biasedText = `SCANDAL: Total failure of leadership exposed! (via ${house.name})`;
        else biasedText = `${text} (via ${house.name})`;
        impact = -8 * (1 - house.bias); // Pro-gov houses reduce negative impact
      } else if (type === HEADLINE_TYPES.POSITIVE) {
        if (house.bias < -0.5) biasedText = `REPORT: Admin claims minor progress. (via ${house.name})`;
        else if (house.bias > 0.5) biasedText = `TRIUMPH: A glorious victory for the nation! (via ${house.name})`;
        else biasedText = `${text} (via ${house.name})`;
        impact = 6 * (1 + house.bias); // Pro-gov houses amplify positive impact
      } else {
        biasedText = `${text} (via ${house.name})`;
        impact = (type === HEADLINE_TYPES.URGENT ? -4 : 0) * (1 - house.bias);
      }

      state.activeHeadlines.unshift({ text: biasedText, type, timestamp: Date.now() });
      state.mediaSentiment += impact * house.reach;
    }
  });

  if (state.activeHeadlines.length > 40) state.activeHeadlines.pop();

  // Pulse global message with the most prominent (neutral) text
  setMessage(`📰 NEWS: ${text}`);
}

function _openOwnershipSubmenu(state) {
  openDecision(state, {
    title: 'MEDIA OWNERSHIP',
    description: 'Acquire outlets to eliminate dissent or amplify your propaganda.',
    options: state.mediaHouses.map(house => ({
      label: house.owned ? `Owns ${house.name} (PRO-GOV)` : `Buy ${house.name} ($${house.cost.toLocaleString()})`,
      consequenceText: house.owned 
        ? `Bias: ${Math.round(house.bias * 100)}% | Reach: ${Math.round(house.reach * 100)}%`
        : `${house.description} (Bias: ${Math.round(house.bias * 100)}%)`,
      action: (gs) => {
        if (house.owned) return;
        if (gs.cash < house.cost) return setMessage('Insufficient funds to buyout this network.');
        gs.cash -= house.cost;
        house.owned = true;
        house.bias = 0.95; // Acquisition turns them into state parrots
        house.reach += 0.1; // Investment boosts reach
        setMessage(`💼 ACQUISITION COMPLETE: ${house.name} is now a state agency.`);
        gs.legitimacy -= 5; // Direct takeover hurts legitimacy
        gs.influence += 10;
        playUIClick();
      }
    })).concat([{ label: "Back", consequenceText: "", action: (gs) => openPressRoom(gs) }])
  });
}

