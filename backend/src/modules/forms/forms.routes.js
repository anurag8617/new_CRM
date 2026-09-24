import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import * as controller from './forms.controller.js';

const router = Router();

// -------------------------------------------------------------------
// PUBLIC UNPROTECTED ENDPOINTS (For Hosted Landing Pages & Form Widgets)
// -------------------------------------------------------------------
router.get('/public/:slug', controller.getPublicForm);
router.post('/public/:slug/submit', controller.submitPublicForm);
router.get('/public/pages/:slug', controller.getPublicLandingPage);

// -------------------------------------------------------------------
// PROTECTED FORMS CRUD (§23 Visual Form Designer)
// -------------------------------------------------------------------
router.get('/', authenticate, controller.getForms);
router.post('/', authenticate, controller.createForm);
router.get('/:id(\\d+)', authenticate, controller.getForm);
router.put('/:id(\\d+)', authenticate, controller.updateForm);
router.delete('/:id(\\d+)', authenticate, controller.deleteForm);

// -------------------------------------------------------------------
// FORM SUBMISSIONS & ATTRIBUTION (§23, §39)
// -------------------------------------------------------------------
router.get('/submissions/all', authenticate, controller.getSubmissions);
router.get('/submissions/:id(\\d+)', authenticate, controller.getSubmission);

// -------------------------------------------------------------------
// LEAD ROUTING & ROUND-ROBIN RULES (§38)
// -------------------------------------------------------------------
router.get('/routing/rules', authenticate, controller.getRoutingRules);
router.post('/routing/rules', authenticate, controller.createRoutingRule);
router.put('/routing/rules/:id(\\d+)', authenticate, controller.updateRoutingRule);
router.delete('/routing/rules/:id(\\d+)', authenticate, controller.deleteRoutingRule);
router.post('/routing/simulate', authenticate, controller.simulateLeadRouting);

// -------------------------------------------------------------------
// LANDING PAGES STUDIO (§23)
// -------------------------------------------------------------------
router.get('/landing-pages/all', authenticate, controller.getLandingPages);
router.post('/landing-pages/all', authenticate, controller.createLandingPage);
router.get('/landing-pages/:id(\\d+)', authenticate, controller.getLandingPage);
router.put('/landing-pages/:id(\\d+)', authenticate, controller.updateLandingPage);
router.delete('/landing-pages/:id(\\d+)', authenticate, controller.deleteLandingPage);

export default router;
