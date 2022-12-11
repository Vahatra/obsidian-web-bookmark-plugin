import { Editor, MarkdownView, Notice, Plugin, requestUrl } from 'obsidian';

// Remember to rename these classes and interfaces!

interface WebBookmarkSettings {
	webBookmarkSettings: string;
}

const DEFAULT_SETTINGS: WebBookmarkSettings = {
	webBookmarkSettings: 'default'
}

export default class WebBookmarkPlugin extends Plugin {
	settings: WebBookmarkSettings;

	async onload() {
		await this.loadSettings();

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'web-bookmark',
			name: 'Web Bookmark',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());

				editor.replaceSelection('');

				// try-catch with a notification in the catch so user knows if 
				// it fails and doesn't sit around waiting 10sec thinking its 
				// just taking a long time to load
				try {
					// get the text from the clipboard
					let clipboardURL = await navigator.clipboard.readText();

					// CHECK URL IS VALID URL, IF NOT NOTIFY AND END FUNCTION
					if (! /^https?:\/\/[^ "]+$/.test(clipboardURL)) {
						new Notice('URL invalid');
						return
					}
					const title = await getTitle(clipboardURL);
					const formatted = '[' + title + ']' + '(' + clipboardURL + ')';

					editor.replaceSelection(formatted);
				} catch (e) {
					console.error(e);
					new Notice('Failed to format link');
				}
			}
		});
	}

	onunload() { }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


}

async function getTitle(url: string) {
	return await requestUrl({ url: url })
		.then((r: any) => r.text)
		// no need to parse whole html just to get title value
		.then((t: string) => {
			// console.log(t);
			// can't use `(?<=<title[^>]*>)` lookbehind bc not fixed width, so 
			// must split steps
			let title = t.match(/<title[^>]*>(.*?)(?=<\/title>)/gs)?.[0] ?? "";
			title = title.replace(/^<title[^>]*>/, '');
			// console.log(title);
			// don't want new line in title
			title = title.replace(/\n|\r/g, '');
			// remove whitespace from start and end
			title = title.trim();
			// decode html entities
			title = decodeHtmlEntities(title);
			return title;
		})
}

function decodeHtmlEntities(str: string) {
	const node = document.createElement("div");
	node.innerHTML = str;
	return node.innerText;
};