import { Application } from 'pixi.js';

import { Resource } from "./Game/Graphics/Resource"
import { createController } from "./Game/createController"
import { Main } from "./Main"


async function main() {
    // Wire up the controller factory before any controllers are instantiated.
    Main.instantiate = createController

    await Resource.load()

    const renderer = new Application({
        antialias: true,
        width: 800,
        height: 600
    });
    const main = new Main(renderer)

    const gameWrapper = document.getElementById('game_wrapper')
    if (gameWrapper) {
        gameWrapper.innerHTML = ''
        gameWrapper.appendChild(renderer.view)
    }
}

main()
