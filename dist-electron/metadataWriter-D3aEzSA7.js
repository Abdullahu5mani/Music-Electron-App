import { TagLib, Tags } from "taglib-wasm";
async function writeMetadata(filePath, metadata, coverArtUrl) {
  let file = null;
  try {
    const taglib = await TagLib.initialize();
    file = await taglib.open(filePath);
    if (!file.isValid()) {
      throw new Error("Invalid audio file");
    }
    const tag = file.tag();
    if (metadata.title) tag.setTitle(metadata.title);
    if (metadata.artist) tag.setArtist(metadata.artist);
    if (metadata.album) tag.setAlbum(metadata.album);
    if (metadata.releaseYear) tag.setYear(metadata.releaseYear);
    if (metadata.trackNumber) tag.setTrack(metadata.trackNumber);
    const properties = {};
    if (metadata.mbid) {
      properties[Tags.MusicBrainzTrackId] = [metadata.mbid];
    }
    if (metadata.albumArtist) {
      properties[Tags.AlbumArtist] = [metadata.albumArtist];
    }
    if (Object.keys(properties).length > 0) {
      file.setProperties(properties);
    }
    if (coverArtUrl) {
      try {
        console.log(`Fetching cover art from: ${coverArtUrl}`);
        const response = await fetch(coverArtUrl);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const buffer = new Uint8Array(arrayBuffer);
          let mimeType = "image/jpeg";
          if (coverArtUrl.toLowerCase().endsWith(".png")) {
            mimeType = "image/png";
          }
          file.setPictures([{
            mimeType,
            data: buffer,
            type: "Cover (front)",
            description: "Cover Art"
          }]);
          console.log("Cover art set successfully");
        } else {
          console.warn(`Failed to fetch cover art: ${response.statusText}`);
        }
      } catch (imgError) {
        console.error("Error processing cover art:", imgError);
      }
    }
    await file.saveToFile();
    return { success: true };
  } catch (error) {
    console.error("Error writing metadata:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  } finally {
    if (file) {
      file.dispose();
    }
  }
}
export {
  writeMetadata
};
