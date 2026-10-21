// Store shares the authenticated, consented, metered commerce research path.
import {researchRequest} from '../lib/research-route.mjs';
export const POST=researchRequest;
export const GET=()=>new Response(null,{status:405,headers:{Allow:'POST'}});
