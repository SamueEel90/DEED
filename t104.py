import asyncio
from playwright.async_api import async_playwright
O='/mnt/user-data/outputs/k104shot/'
async def main():
  async with async_playwright() as p:
    b=await p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    for W,H,nm in [(390,844,'mobil'),(900,1200,'tablet'),(1440,900,'pc')]:
      INIT="localStorage.setItem('deed.session', JSON.stringify({demo:true}));localStorage.setItem('deed.intro.v1','1');localStorage.setItem('deed.motiv','svetly');"
      ctx=await b.new_context(viewport={'width':W,'height':H}); await ctx.add_init_script(INIT)
      pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
      await pg.goto('http://localhost:5173/m/profil'); await pg.wait_for_timeout(2500)
      await pg.get_by_text('Spravovať').first.click(); await pg.wait_for_timeout(1500)
      sel=pg.locator('[aria-label="DEV"] select').first
      opts=await sel.locator('option').evaluate_all("o=>o.map(x=>[x.value,x.textContent])")
      for v,t in opts:
        await sel.select_option(v); await pg.wait_for_timeout(700)
        r=await pg.evaluate("""(()=>{const s=document.querySelector('[aria-label="Zväčšiť štít"]');const st=s?s.parentElement.getBoundingClientRect():null;
          const z=[...document.querySelectorAll('button')].filter(b=>/dnes (\\+|zatiaľ)/.test(b.innerText)&&b.querySelector('b')).length;
          const logo=!!document.querySelector('[data-logo-qr]');
          const zb=[...document.querySelectorAll('button')].some(b=>/Bežiace zbierky|BEŽIACE ZBIERKY/.test(b.innerText))||/BEŽIACE ZBIERKY/i.test(document.body.innerText);
          return [st?Math.round(st.width):0, st?Math.round(st.height):0, z, logo, zb, document.documentElement.scrollWidth]})()""")
        print(nm, v, r)
        await pg.screenshot(path=O+f'{nm}_{v}.png')
      print(nm,'errs',errs); await ctx.close()
    await b.close()
asyncio.run(main())
