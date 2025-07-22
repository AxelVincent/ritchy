import 'dotenv/config'
import { ChatAnthropic } from '@langchain/anthropic'
import { scrapeUrlsFromWebPage } from '../../services/scraper/scrape_website_manager'
import { websiteEnrichmentManager } from '../../services/enrichment/website_enrichment_manager'
import {
  WebCrawlerAssistantSchema,
  webCrawlerAssistant
} from './prompts/web_crawler_assistant'

const llm = new ChatAnthropic({
  model: 'claude-3-5-haiku-20241022',
  temperature: 0
})

const getLLM = async (url: string, businessName: string) => {
  const structuredOutput = llm.withStructuredOutput(WebCrawlerAssistantSchema)

  const business = {
    name: businessName,
    url: url
  }

  const links = await scrapeUrlsFromWebPage(business.url)

  console.log(links)

  const prompt = await webCrawlerAssistant.invoke({
    links: links.internal,
    business_name: business.name
  })

  const result = await structuredOutput.invoke(prompt)
  console.log(result, result.internal_urls.length)
  return llm
}
;(async () => {
  // const websites = [
  //   'http://www.crossfit-ant.com/',
  //   'http://legnano.dynamictraininglab.com/',
  //   'http://www.therisemilano.com/',
  //   'https://crossfitiltempio.altervista.org/',
  //   'https://www.crossfitgallarate.com/',
  //   'https://crossfitbuccinasco.com/',
  //   'http://www.crossfit20020.it/',
  //   'https://cfthorax.com/',
  //   'http://www.mylandcrossfit.com/',
  //   'https://ironbullcorbetta.it/',
  //   'https://theboxgarbagnate.it/',
  //   'https://form.jotform.com/241281486167360',
  //   'https://www.facebook.com/crossfitgroane/',
  //   'http://www.donkeycrossfit.it/',
  //   'https://www.crossfitcorsico.com/',
  //   'https://studioaudentesasd.com/',
  //   'https://www.nodaysoff.it/parabiago',
  //   'https://m.facebook.com/crossfitwildlions/',
  //   'http://www.crossfitrho.com/',
  //   'http://www.crossfitsempione.com/',
  //   'https://instagram.com/ultraboxsaronno?igshid=MzRlODBiNWFlZA==',
  //   'https://www.workoutbareggio.it/',
  //   'http://www.hyperliftarena.it/',
  //   'http://www.clubn15.it/',
  //   'http://crossfitfullgear.com/',
  //   'https://www.actionfit.it/',
  //   'http://www.fitsquare.it/',
  //   'http://campus.propatriajudo.it/',
  //   'https://twelvefitnessmilano.com/',
  //   'http://www.msxsportingclub.it/',
  //   'https://www.firemantraining.it/',
  //   'https://www.crossfitsestosangiovanni.com/',
  //   'http://www.crossfitnovamilanese.com/',
  //   'http://www.factoryfitness.it/',
  //   'https://crossfitofficinemilano.com/',
  //   'http://www.csbpalestra.it/',
  //   'http://www.crossfit97.com/',
  //   'http://www.crossfitavanguardia.com/',
  //   'http://www.crossfitbullams.com/',
  //   'http://www.crossfitnolo.com/',
  //   'http://www.crossfitarctos.com/',
  //   'https://www.crossfit.com/',
  //   'http://www.crossfitm1.com/',
  //   'http://www.crossfitsegrate.com/',
  //   'http://www.crossfitmonza.it/',
  //   'https://www.crossfitarcore.it/',
  //   'http://www.nodaysoff.it/',
  //   'http://www.crossfitburbero.com/',
  //   'http://www.crossfitmartesana.com/',
  //   'http://www.crossfitdarsena.com/',
  //   'http://www.crossfitvalax.it/',
  //   'http://www.crossfitlambrate.com/',
  //   'http://www.crossfitbicocca.com/',
  //   'http://www.crossfitmediolanvm.com/',
  //   'http://www.meccanicacrossfit.com/',
  //   'http://www.hatlexdesio.it/',
  //   'http://www.realboxcrossfit.it/',
  //   'http://www.coronaferreacrossfit.com/',
  //   'https://blwrk.fit/',
  //   'http://www.crossfitportanuova.com/',
  //   'https://www.crossfitpowerville.com/',
  //   'https://www.lescimmie.net/',
  //   'https://www.crossfitcenisiocertosa.it/',
  //   'https://form.jotform.com/242241937507053',
  //   'http://www.crossfit1995.com/',
  //   'https://www.ironfit.it/web',
  //   'http://www.crossfitankormediglia.it/',
  //   'http://www.crossfitadamantio.it/',
  //   'https://www.crossfitbullmoose.com/',
  //   'https://www.saraventura.com/',
  //   'https://www.crossfitmissaglia.it/',
  //   'http://isritalia.com/',
  //   'https://crossfitankormediglia.it/',
  //   'https://www.crossfitburiacus.it/',
  //   'https://www.tritiumtrainingcenter.com/',
  //   'https://www.instagram.com/lab15ssd_/?igsh=a2gydTQyOHp2cDhu',
  //   'https://atleticaworkout.wordpress.com/',
  //   'https://www.factoryprecotto.com/',
  //   'http://www.spaziofitnessclub.it/',
  //   'https://www.milanotrainingclub.it/',
  //   'http://www.palestrabeautyisland.it/',
  //   'http://www.dunamismilano.com/',
  //   'https://www.dunamismilano.com/',
  //   'https://www.virginactive.it/club/milano-cavour',
  //   'https://yolycrossfit.it/',
  //   'https://instagram.com/crossfit_twelve?igshid=MzRlODBiNWFlZA==',
  //   'http://www.pentacrossfit.com/',
  //   'http://www.crossfitpavia.com/',
  //   'https://www.crossfit2pairs.it/',
  //   'https://palestrashadow.com/crossfit-sky-dome/',
  //   'https://www.instagram.com/crossfitdea/',
  //   'https://www.sp40fitness.com/',
  //   'http://www.athleticdance.it/crossfit/?page_id=186',
  //   'http://www.palestrashadow.com/',
  //   'https://artedelmovimentopavia.it/',
  //   'http://www.crossfitdeed.com/',
  //   'https://www.crosswork.it/?utm_source=places'
  // ]
  // const promises = []
  // for (const url of websites) {
  //   promises.push(scrapeUrlsFromWebPage(url))
  // }

  const url = 'https://www.ritchy.io/'
  const businessName = 'Ritchy'
  // const docs = await scrapeUrlsFromWebPage(url)
  // console.log({
  //   url,
  //   internal_count: docs.internal.length,
  //   internal: docs.internal,
  //   emails: docs.emails,
  //   phones: docs.phones,
  //   links: docs.links,
  //   social: docs.social,
  //   files: docs.files,
  //   images: docs.images
  // })
  // await getLLM(url, businessName)
  await websiteEnrichmentManager({ url })
})().catch((err) => {
  console.error(err)
})

// BrightData
// 1.95/1000 = 0,00095

// FireCrawl
// 99/100000 = 0,00099
// 399/500000 = 0,000798
