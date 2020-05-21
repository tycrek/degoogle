// Build tool for generating README.md

const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const YAML = require('yaml');

function __main__() {
    let lines = `| Name | Eyes | Description |${os.EOL}| ---- | ---- | ----------- |${os.EOL}`;

    let dgData = YAML.parse(fs.readFileSync(path.join(__dirname, 'degoogle.yml')).toString());
    dgData['web based products'].forEach(item => {
        let name = `[${item.name}](${item.url})`;
        let eyes = item.eyes ? `**${item.eyes}-eyes**` : '';
        let text = item.text.trim();

        let entry = `| ${name} | ${eyes} | ${text} |`;
        
        lines = lines.concat(entry + os.EOL)
    });

    fs.writeFileSync('README-test.md', lines);
}

__main__();