var express = require('express')
var { join } = require('path')
var puppeteer = require('puppeteer')

//utility..
const wait = (seconds) => {
    console.log('waiting', seconds, 'seconds')
    return new Promise((res, rej) => {
        setTimeout(res, seconds * 1000)
    })
}


const runPuppeteer = async() => {

    const browser = await puppeteer.launch({
        defaultViewport: null,
        headless: false
    })

    const page = await browser.newPage()

    await page.goto('http://127.0.0.1:5000')
    await wait(3)

    console.log('page opened..')

    // only execute this function within a page context!.
    // for example in page.evaluate() OR page.waitForFunction etc.
    // don't forget to pass the selector args to the page context function!
    const selectShadowElement = (containerSelector, elementSelector) => {
        try {

            // get the container
            const container = document.querySelector(containerSelector)

            // Here's the important part, select the shadow by the parentnode of the 
            // actual shadow root and search within the shadowroot which is like another DOM!,
            return container.shadowRoot.querySelector(elementSelector)
        } catch (err) {
            return null
        }
    }

    console.log('waiting for shadow elemetn now.')

    const containerSelector = '.shadow'
    const elementSelector = '#hoge'
    const result = await page.waitForFunction(selectShadowElement, { timeout: 15 * 1000 }, containerSelector, elementSelector)

    if (!result) {
        console.error('Shadow element not found..')
        return
    }

    // since waiting succeeded we can get the elemtn now.
    const element = await page.evaluateHandle(selectShadowElement, containerSelector, elementSelector)

    try {

        // click the element.
        await element.click()
        console.log('clicked')

    } catch (err) {
        console.log('failed to click..')
    }

    await wait(10)

}

var app = express()

app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'))
})

app.listen(5000, '127.0.0.1', () => {
    console.log('listening!')

    runPuppeteer()
})