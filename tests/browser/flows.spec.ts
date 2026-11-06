import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
const origin='http://127.0.0.1:3100';
async function signIn(page:Page){await page.goto('/admin');await page.getByLabel('Admin password').fill('higo-browser-test-password');await page.getByRole('button',{name:'Sign in',exact:false}).click();await expect(page.getByRole('button',{name:'Sign out'})).toBeVisible();}

test('journal, comparison selectors, photo metadata dialog, and responsive layouts',async({page})=>{
  await page.goto('/');await expect(page.getByRole('heading',{level:1})).toContainText('A world of ice');
  await expect(page.locator('.hero-story-photo')).toHaveJSProperty('complete',true);
  await expect(page.getByTestId('atlas-map')).toHaveAttribute('data-ready','true');
  await expect(page.locator('.atlas-result').first()).toBeVisible();
  await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});
  await page.goto('/glaciers/drang-drang');await expect(page.getByLabel('Left photograph')).toHaveValue('drang-undated');
  await expect(page.getByLabel('Comparison mode')).toHaveValue('side');
  await page.getByLabel('Right photograph').selectOption('drang-snow');
  await expect(page.locator('.comparison-grid figure').nth(1).locator('.image-date')).toHaveText('Date unknown');
  await page.getByRole('button',{name:/Open photograph/}).first().click();await expect(page.locator('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible();
  await page.goto('/glaciers/panchinala');await expect(page.locator('.timeline article')).toHaveCount(2);await expect(page.locator('.photo-card')).toHaveCount(3);
  await page.setViewportSize({width:390,height:844});
  for(const path of ['/','/glaciers/drang-drang','/glaciers/panchinala','/contribute','/about','/admin']){await page.goto(path);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), `Horizontal overflow on ${path}`).toBe(true);}
  await page.goto('/');await expect(page.getByTestId('atlas-map')).toHaveAttribute('data-ready','true');await expect(page.locator('.atlas-result').first()).toBeVisible();await page.screenshot({path:'test-results/home-mobile.png',fullPage:true});
});

test('anonymous upload → private pending → admin approval → visible journal → unpublish',async({page,browser})=>{
  await page.goto('/contribute?glacier=panchinala');
  await page.getByLabel('Choose photograph',{exact:true}).setInputFiles('Panchinala/DSCF1629.jpg');
  await expect(page.getByText('No capture date found.')).toBeVisible();
  await page.getByLabel('How precisely').selectOption('year');await page.getByLabel('Capture date',{exact:true}).fill('2020');
  await page.getByLabel('This date is approximate').check();await page.getByLabel('Photographer credit').fill('Browser test photographer');
  await page.getByLabel('A note from this moment').fill('A browser test observation');await page.getByLabel('Contact email').fill('private@example.test');
  await page.getByRole('checkbox',{name:/I took this photograph/}).check();await page.getByRole('button',{name:'Send for review'}).click();
  await expect(page).toHaveURL(/\/submission\/[a-f0-9]{64}$/);const receipt=page.url();await expect(page.getByText('Awaiting review',{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByText('Your photograph has been saved.')).toBeVisible();
  const publicContext=await browser.newContext();const anon=await publicContext.newPage();await anon.goto('/glaciers/panchinala');await expect(anon.getByText('A browser test observation',{exact:true})).toHaveCount(0);
  await signIn(page);await page.getByRole('link',{name:/A browser test observation/}).click();await expect(page).toHaveURL(/\/admin\/observations\/[a-f0-9-]+$/);const id=page.url().split('/').pop()!;
  expect((await anon.request.get(`/api/media/${id}`)).status()).toBe(404);
  expect((await anon.request.get(`/api/media/${id}?variant=original`)).status()).toBe(404);
  expect((await anon.request.post(`/api/admin/observations/${id}`,{headers:{origin},form:{status:'approved'}})).status()).toBe(401);
  await page.getByLabel('Review status').selectOption('approved');await page.getByRole('button',{name:'Save review'}).click();await expect(page.getByRole('status')).toContainText('Observation saved');
  await anon.reload();await expect(anon.locator('.photo-card').filter({hasText:'A browser test observation'})).toHaveCount(1);expect(await anon.content()).not.toContain('private@example.test');
  expect((await anon.request.get(`/api/media/${id}`)).status()).toBe(200);expect((await anon.request.get(`/api/media/${id}?variant=original`)).status()).toBe(404);
  await anon.goto(receipt);await expect(anon.getByText('Published in the record',{exact:true})).toBeVisible();
  await page.getByLabel('Review status').selectOption('pending');await page.getByRole('button',{name:'Save review'}).click();await expect(page.getByRole('status')).toContainText('Observation saved');
  expect((await anon.request.get(`/api/media/${id}`)).status()).toBe(404);await anon.goto('/glaciers/panchinala');await expect(anon.getByText('A browser test observation',{exact:true})).toHaveCount(0);
  await publicContext.close();
});

test('curation validates chronology, produces keyboard-accessible slider, and revokes derived media',async({page,request})=>{
  await signIn(page);await page.goto('/admin/comparisons');
  await page.getByLabel('Earlier photograph').selectOption('panchi-20240610');await page.getByLabel('Later photograph').selectOption('panchi-20240609');
  await page.getByLabel('Comparison caption').fill('Test fixture only: curation plumbing, not scientific evidence.');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Publish comparison'}).click();await expect(page.locator('.error-message[role=alert]')).toContainText('earlier and a later');
  await page.getByLabel('Earlier photograph').selectOption('panchi-20240609');await page.getByLabel('Later photograph').selectOption('panchi-20240610');
  await page.getByRole('button',{name:'Publish comparison'}).click();await expect(page.getByRole('status')).toContainText('Comparison published');
  await page.goto('/glaciers/panchinala');const mode=page.getByLabel('Comparison mode');const pair=await mode.locator('option').nth(1).getAttribute('value');await mode.selectOption(pair!);
  const slider=page.getByRole('slider',{name:'Reveal earlier photograph'});await slider.focus();await page.keyboard.press('ArrowRight');await expect(slider).toHaveValue('51');
  expect((await request.get(`/api/comparison-media/${pair}/before`)).status()).toBe(200);
  await page.goto('/admin/observations/panchi-20240609');await page.getByRole('textbox',{name:'Caption',exact:true}).fill('Metadata correction triggers comparison review');await page.getByRole('button',{name:'Save review'}).click();await expect(page.getByRole('status')).toContainText('Observation saved');
  expect((await request.get(`/api/comparison-media/${pair}/before`)).status()).toBe(404);
  await page.goto('/glaciers/panchinala');await expect(page.getByLabel('Comparison mode')).toHaveCount(0);
});

test('bad input and cross-origin writes are rejected; originals and admin pages are private',async({request,page})=>{
  const invalid=await request.post('/api/observations',{headers:{origin},multipart:{photo:{name:'bad.jpg',mimeType:'image/jpeg',buffer:Buffer.from('not a JPEG')},consent:'yes',date_precision:'unknown'}});expect(invalid.status()).toBe(400);
  const oversized=await request.post('/api/observations',{headers:{origin},multipart:{photo:{name:'big.jpg',mimeType:'image/jpeg',buffer:Buffer.alloc(21*1024*1024)},consent:'yes',date_precision:'unknown'}});expect(oversized.status()).toBe(413);
  expect((await request.post('/api/observations',{headers:{origin:'https://untrusted.example'},form:{}})).status()).toBe(403);
  expect((await request.get('/api/media/drang-2023?variant=original')).status()).toBe(404);
  await page.goto('/admin/observations/drang-2023');await expect(page).toHaveURL(/\/admin$/);await expect(page.getByLabel('Admin password')).toBeVisible();
  await page.getByLabel('Admin password').fill('wrong-password');await page.getByRole('button',{name:'Sign in',exact:false}).click();await expect(page.locator('.error-message[role=alert]')).toContainText('not recognised');
});
