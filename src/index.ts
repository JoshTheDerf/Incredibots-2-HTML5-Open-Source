import { Application } from 'pixi.js';

import { Main } from './Main'
import { Resource } from './Game/Graphics/Resource'


async function main() {
    await Resource.load()

    const renderer = new Application();
    const main = new Main(renderer)

    document.body.appendChild(renderer.view)
}

main()
