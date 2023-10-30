
import { question } from 'zx/experimental'

const test = echo(await question('What is your favorite color?', { hideInput: true}));
