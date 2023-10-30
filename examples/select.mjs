
import { select } from 'zx/experimental'

const test = echo(await select('What is your favorite color?', ['red', 'green', 'blue']));
