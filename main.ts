import { Editor, Notice, Plugin, requestUrl } from 'obsidian';

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

		// just title
		this.addCommand({
			id: 'web-bookmark-title',
			name: 'Web Bookmark Title',
			editorCallback: async (editor: Editor) => {
				try {
					let clipboardText = await navigator.clipboard.readText();
					if (!this.isUrl(clipboardText)) {
						new Notice('URL invalid');
						return
					}
					const output = await getTitle(clipboardText);

					editor.replaceSelection(output);
				} catch (e) {
					console.error(e);
					new Notice('Failed to format link');
				}
			}
		});

		// iframe
		this.addCommand({
			id: 'web-bookmark-iframe',
			name: 'Web Bookmark iFrame',
			editorCallback: async (editor: Editor) => {
				try {
					let clipboardText = await navigator.clipboard.readText();
					if (!this.isUrl(clipboardText)) {
						new Notice('URL invalid');
						return
					}
					const output = await getIframely(clipboardText);

					editor.replaceSelection(output);
				} catch (e) {
					console.error(e);
					new Notice('Failed to format link');
				}
			}
		});
	}

	isUrl(text: string): boolean {
		const urlRegex = new RegExp(
			"^(http:\\/\\/www\\.|https:\\/\\/www\\.|http:\\/\\/|https:\\/\\/)?[a-z0-9]+([\\-.]{1}[a-z0-9]+)*\\.[a-z]{2,5}(:[0-9]{1,5})?(\\/.*)?$"
		);
		return urlRegex.test(text);
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

			return '[' + title + ']' + '(' + url + ')';
		})
}

function decodeHtmlEntities(str: string) {
	const node = document.createElement("div");
	node.innerHTML = str;
	return node.innerText;
};


async function getIframely(url: string) {
	return await requestUrl({ url: `http://iframely.server.crestify.com/iframely?url=${url}` })
		.then((t: any) => t.text)
		.then((r: any) => {
			const data = JSON.parse(r);
			const imageLink = data.links[0].href || '';

			return `<div>
	<a class="rich-link-card" href="${url}" target="_blank">
		<div class="rich-link-image-container">
			<div class="rich-link-image" style="background-image: url('${imageLink}')"></div>
		</div>
		<div class="rich-link-card-text">
			<h1 class="rich-link-card-title">${(data.meta.title || "").replace(/\s{3,}/g, ' ').trim()}</h1>
			<p class="rich-link-card-description">
				${(data.meta.description || "").replace(/\s{3,}/g, ' ').trim()}
			</p>
			<p class="rich-link-href">
				${url}
			</p>
		</div>
	</a>
</div>\n`;
		})
}