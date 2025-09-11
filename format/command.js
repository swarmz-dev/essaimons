import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import patterns from './patterns.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = join(__dirname, '..');

const isCheck = process.argv.slice(2).includes('--check');
const prettierFlag = isCheck ? '--check' : '--write';

const formatAll = () => {
    try {
        Object.keys(patterns).forEach((key) => {
            const pattern = patterns[key];
            if (!pattern) return;

            const dir = key === 'root' ? root : join(root, key);
            console.log(`${isCheck ? 'Checking' : 'Formatting'} ${key} -> ${dir}`);

            const glob = key === 'root' ? pattern : `'${pattern}'`;

            execSync(`npx prettier ${prettierFlag} ${glob} --ignore-unknown`, { stdio: 'inherit', cwd: dir });
        });
    } catch (err) {
        console.error('Format error :', err);
        process.exit(1);
    }
};

formatAll();
