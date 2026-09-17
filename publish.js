#!/usr/bin/env node
/**
 * Publish an Instagram carousel (up to 10 images) via the Meta Graph API.
 *
 * Required environment variables (set as GitHub Actions secrets):
 *   IG_USER_ID       Instagram Business Account ID (a numeric ID, NOT the @username)
 *   IG_ACCESS_TOKEN  Long-lived or System User access token with
 *                     instagram_basic + instagram_content_publish scopes
 *
 * Required repo layout:
 *   assets/<folder>/slide_01.png ... slide_10.png   (public images, committed to the repo)
 *   assets/<folder>/caption.txt                      (caption + hashtags, plain text)
 *
 * Usage:
 *   node publish.js <folder> <github-owner> <github-repo> [branch]
 *
 * Example:
 *   node publish.js gold-2026-09-18 bw-house1109 ig-auto-publish main
 */

const GRAPH_VERSION = "v23.0";
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

async function gpost(path, params) {
  const res = await fetch(`${GRAPH}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(`Graph API error on ${path}: ${JSON.stringify(json.error)}`);
  }
  return json;
}

async function gget(path, params) {
  const res = await fetch(`${GRAPH}/${path}?${new URLSearchParams(params)}`);
  const json = await res.json();
  if (json.error) {
    throw new Error(`Graph API error on ${path}: ${JSON.stringify(json.error)}`);
  }
  return json;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitUntilReady(containerId, accessToken, maxTries = 20) {
  for (let i = 0; i < maxTries; i++) {
    const status = await gget(containerId, { fields: "status_code", access_token: accessToken });
    if (status.status_code === "FINISHED") return;
    if (status.status_code === "ERROR") {
      throw new Error(`Container ${containerId} failed processing`);
    }
    await sleep(3000);
  }
  throw new Error(`Container ${containerId} did not finish processing in time`);
}

async function main() {
  const [, , folder, owner, repo, branch = "main"] = process.argv;
  if (!folder || !owner || !repo) {
    console.error("Usage: node publish.js <folder> <github-owner> <github-repo> [branch]");
    process.exit(1);
  }

  const igUserId = process.env.IG_USER_ID;
  const accessToken = process.env.IG_ACCESS_TOKEN;
  if (!igUserId || !accessToken) {
    console.error("Missing IG_USER_ID or IG_ACCESS_TOKEN environment variables");
    process.exit(1);
  }

  const fs = require("fs");
  const path = require("path");
  const dir = path.join(__dirname, "assets", folder);
  if (!fs.existsSync(dir)) {
    console.error(`Folder not found: ${dir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => /^slide_\d+\.png$/.test(f))
    .sort();

  if (files.length === 0) {
    console.error(`No slide_NN.png files found in ${dir}`);
    process.exit(1);
  }
  if (files.length > 10) {
    console.error("Instagram carousels support a maximum of 10 images");
    process.exit(1);
  }

  const captionPath = path.join(dir, "caption.txt");
  const caption = fs.existsSync(captionPath) ? fs.readFileSync(captionPath, "utf8").trim() : "";

  console.log(`Publishing ${files.length} slides from "${folder}" as a carousel...`);

  // Step 1: create one media container per image. image_url must be a
  // publicly fetchable URL, so this relies on the images already being
  // committed and pushed to the given branch of the given public repo.
  const childIds = [];
  for (const file of files) {
    const imageUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/assets/${folder}/${file}`;
    console.log(`  container for ${file} -> ${imageUrl}`);
    const created = await gpost(igUserId, {
      image_url: imageUrl,
      is_carousel_item: "true",
      access_token: accessToken,
    });
    childIds.push(created.id);
  }

  // Step 2: create the carousel container that references all children.
  const carousel = await gpost(igUserId, {
    media_type: "CAROUSEL",
    caption,
    children: childIds.join(","),
    access_token: accessToken,
  });

  console.log(`Carousel container: ${carousel.id}, waiting for processing...`);
  await waitUntilReady(carousel.id, accessToken);

  // Step 3: publish the finished container.
  const published = await gpost(igUserId, {
    creation_id: carousel.id,
    access_token: accessToken,
  });

  console.log("Published! Media ID:", published.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
