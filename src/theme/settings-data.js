const _ = require('lodash');
const fs = require('fs');
// const {  } = require('./helper');

class SettingsData {
	constructor(pathToTheme) {
		this.pathToTheme = pathToTheme;
		this.settings = {};

		this.readFileContent();
		this.analyzeContent();
	}

	readFileContent() {
		this.content = '{ "current": {} }';
		try {
			this.content = fs.readFileSync(`${this.pathToTheme}/config/settings_data.json`, { encoding: 'utf-8' });
		} catch (error) {
			console.log(`Read settings error: ${error}`);
		}

		this.settings = JSON.parse(this.content).current;
	}

	analyzeContent() {
		this.indexSections = [];
		this.sectionSettings = [];
		this.sectionSettingsUnused = _.keys(this.settings.sections);
		if (this.settings.content_for_index && this.settings.content_for_index.length > 0) {
			_.forEach(this.settings.content_for_index, (id) => {
				const config = this.settings.sections[id];
				if (!config.disabled) {
					this.indexSections.push(config.type);
					this.sectionSettingsUnused.splice(this.sectionSettingsUnused.indexOf(id), 1);
					this.sectionSettings.push(id);
				}
			});
		}
	}

	foundSections(sectionName) {
		if (this.sectionSettingsUnused.includes(sectionName)) {
			this.sectionSettingsUnused.splice(this.sectionSettingsUnused.indexOf(sectionName), 1);
			this.sectionSettings.push(sectionName);
		}
	}
}

module.exports = SettingsData;
