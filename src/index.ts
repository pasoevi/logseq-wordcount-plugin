import "@logseq/libs";
import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import getCount from "./services/getCount";
import renderCount from "./services/renderCount";
import { settings } from "./services/settings";
import { mixedWordsFunction, simpleWordsFunction } from "./services/countWords";

const main = async () => {
  console.log("Wordcount plugin loaded");

  // Style for word counter
  logseq.provideStyle(`
    .wordcount-btn {
       border: 1px solid var(--ls-border-color);
       white-space: initial;
       padding: 2px 4px;
       border-radius: 4px;
       user-select: none;
       cursor: default;
       display: flex;
       align-content: center;
    }
    `);

  logseq.Editor.registerSlashCommand("Word count", async () => {
    await logseq.Editor.insertAtEditingCursor(`{{renderer :wordcount_}}`);
  });

  logseq.Editor.registerSlashCommand("Writing session target", async () => {
    await logseq.Editor.insertAtEditingCursor(`{{renderer :wordcount_, 500}}`);
  });

  logseq.Editor.registerSlashCommand("Character count", async () => {
    await logseq.Editor.insertAtEditingCursor(`{{renderer :wordcountchar_}}`);
  });

  logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
    const uuid = payload.uuid;
    const [type, target] = payload.arguments;
    if (!type.startsWith(":wordcountchar_") && !type.startsWith(":wordcount_"))
      return;

    const wordcountId = `wordcount_${type.split("_")[1]?.trim()}_${slot}`;

    const headerBlock = await logseq.Editor.getBlock(uuid, {
      includeChildren: true,
    });

    if (type.startsWith(":wordcount_")) {
      let totalCount = getCount(
        headerBlock!.children as BlockEntity[],
        "words"
      );
      renderCount(slot, wordcountId, type, target, totalCount);
    } else if (type.startsWith(":wordcountchar_")) {
      let totalCount = getCount(
        headerBlock!.children as BlockEntity[],
        "chars"
      );
      renderCount(slot, wordcountId, type, target, totalCount);
    } else {
      logseq.UI.showMsg(
        "Please do not change the render parameters except for your writing target.",
        "error"
      );
    }
  });

  logseq.App.onMacroRendererSlotted(async ({ slot, payload }) => {
    const [type, count] = payload.arguments;
    if (!type.startsWith(":wordcount-page_")) return;
    const wordcountId = `wordcount-page_${type.split("_")[1]?.trim()}_${slot}`;

    logseq.provideUI({
      key: wordcountId,
      slot,
      reset: true,
      template: `
          <button class="wordcount-btn" data-slot-id="${wordcountId}" data-wordcount-id="${wordcountId}">Wordcount: ${count}</button>`,
    });
  });

  logseq.Editor.registerSlashCommand("Word count - page", async () => {
    await logseq.Editor.insertAtEditingCursor(
      `{{renderer :wordcount-page_, 0}}`
    );
  });

  logseq.provideStyle(`
											.wordcount {
												font-family: "Courier New", monospace;
												font-size: 13px;
												padding: 0 5px;
												border: 1px solid;
												border-radius: 8px;
											}
											`);

  let count = 0;
  logseq.DB.onChanged(async function ({ blocks }) {
    if (blocks.length === 1) {
      const content = blocks[0].content;
      count = mixedWordsFunction(content);
      const blk = await logseq.Editor.getCurrentBlock();
      if (blk) {
        const page = await logseq.Editor.getPage(blk.page.id);
        const pbt = await logseq.Editor.getPageBlocksTree(page!.name);
        if (pbt[0].content.includes("{{renderer :wordcount-page_,")) {
          let content = pbt[0].content;
          const regexp = /\{\{renderer :wordcount-page_,(.*?)\}\}/;
          const matched = regexp.exec(content);
          content = content.replace(
            matched[0],
            `{{renderer :wordcount-page_, ${count}}}`
          );

          await logseq.Editor.updateBlock(pbt[0].uuid, content);
        }
      }
    }

    if (logseq.settings!.toolbar) {
      logseq.App.registerUIItem("toolbar", {
        key: "wordcount-page",
        template: `<p class="wordcount">${count} words</p>`,
      });
    }
  });
};

logseq.useSettingsSchema(settings).ready(main).catch(console.error);
