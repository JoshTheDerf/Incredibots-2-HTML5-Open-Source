import { Application } from 'pixi.js';

import { Main } from './Main'
import { Resource } from './Game/Graphics/Resource'


async function main() {
    await Resource.load()

    const renderer = new Application({
        transparent: false,
        antialias: true,
        width: 800,
        height: 600
    });
    const main = new Main(renderer)

    document.getElementById('page_wrapper').appendChild(renderer.view)
}

main()
