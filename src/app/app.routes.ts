import { Routes } from '@angular/router';
import { Landing } from './Pages/landing/landing';
import { Templates } from './Pages/templates/templates';
import { TemplatePreview } from './Pages/template-preview/template-preview';

export const routes: Routes = [
    {path:'' , component: Landing , title: 'Momentry'},
    {path:'templates' , component: Templates , title: 'Momentry Templates'},
    {path:'templates/:category/:slug' , component: TemplatePreview , title: 'Template Preview'}
];
