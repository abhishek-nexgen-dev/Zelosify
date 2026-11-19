export function createPptxFixture(text: string): Buffer {
  const filename = Buffer.from("ppt/slides/slide1.xml");
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const xml = Buffer.from(`<a:t>${escaped}</a:t>`);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt32LE(xml.length, 18);
  local.writeUInt32LE(xml.length, 22);
  local.writeUInt16LE(filename.length, 26);
  const localEntry = Buffer.concat([local, filename, xml]);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt32LE(xml.length, 20);
  central.writeUInt32LE(xml.length, 24);
  central.writeUInt16LE(filename.length, 28);
  const centralEntry = Buffer.concat([central, filename]);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(centralEntry.length, 12);
  end.writeUInt32LE(localEntry.length, 16);
  return Buffer.concat([localEntry, centralEntry, end]);
}

export function toolCallResponse(id: string, name: string) {
  return {
    data: {
      choices: [{
        message: {
          tool_calls: [{ id, type: "function", function: { name, arguments: "{}" } }],
        },
      }],
      usage: { prompt_tokens: 20, completion_tokens: 5 },
    },
  };
}

export function explanationResponse(text = "The candidate matches the required skills and experience. This is decision support for the hiring team.") {
  return {
    data: {
      choices: [{ message: { content: text } }],
      usage: { prompt_tokens: 20, completion_tokens: 15 },
    },
  };
}
