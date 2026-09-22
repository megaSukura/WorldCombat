# Third-party notices

WorldCombat's original code and original content use GPL-3.0-or-later with the additional permission in `LICENSE-MINECRAFT-EXCEPTION.txt`. Third-party components retain their own terms. The project owner has approved this license and the public distribution of the project's original code and content.

## Independently installed runtime dependencies

The player archive contains WorldCombat's two jars and content, not copies of the following mods. Exact build versions are in `manifests/dependencies.toml` in the source distribution and `INSTALL.md` in the player distribution.

| Component | Attribution | License / upstream source |
| --- | --- | --- |
| MadParticle | USS_Shenzhou | [GPL-3.0-or-later](https://github.com/USS-Shenzhou/MadParticle/blob/master/LICENSE); [additional permissions](https://github.com/USS-Shenzhou/MadParticle/blob/master/README.md) |
| T88 | USS_Shenzhou | [GPL-3.0-or-later](https://github.com/USS-Shenzhou/t88/blob/master/LICENSE); [additional permissions](https://github.com/USS-Shenzhou/t88/blob/master/README.md) |
| LDLib2 | KilaBash / Low-Drag-MC contributors | [LGPL-3.0](https://github.com/Low-Drag-MC/LDLib2/blob/1.21/LICENSE) |
| KubeJS | latvian.dev and contributors | [LGPL-3.0](https://github.com/kube-mods/kubejs/blob/2101/LICENSE.txt) |
| Rhino | latvian.dev, Mozilla and contributors | [MPL-2.0](https://github.com/kube-mods/rhino/blob/main/LICENSE) |
| Cobblemon code | Cobblemon Contributors | [MPL-2.0](https://gitlab.com/cable-mc/cobblemon/-/blob/main/LICENSE), [copyright header](https://gitlab.com/cable-mc/cobblemon/-/blob/main/HEADER) |
| NeoForge | The NeoForged Team and contributors | [LGPL-2.1](https://github.com/neoforged/NeoForge/blob/1.21.1/LICENSE.txt) |
| Kotlin for Forge | thedarkcolour and contributors | [LGPL-2.1](https://github.com/thedarkcolour/KotlinForForge/blob/5.x/LICENSE) |
| JEI (optional) | mezz and contributors | [MIT](https://github.com/mezz/JustEnoughItems/blob/1.21.1/LICENSE.txt) |
| Create (optional) | simibubi and Create contributors | [MIT](https://github.com/Creators-of-Create/Create/blob/mc1.21.1/dev/LICENSE) |
| Curios (optional) | C4 and contributors | [LGPL-3.0-or-later](https://github.com/TheIllusiveC4/Curios) |

WorldCombat accesses MadParticle and T88 packages beyond their narrowly exempted developer APIs. Their stated exceptions are not treated as a general exemption for this integration. WorldCombat's own additional permission does not grant rights in these dependencies.

## Resources

Particle and effect atlas definitions refer to resource identifiers supplied by an installed Minecraft or Cobblemon. Those references do not relicense the referenced textures, models or sounds. Cobblemon assets can have separate, directory-specific licenses; the code's MPL is not a blanket asset license.

Retired Photon/Unity/MasterMagicFX assets and their historical source trees are excluded from the public source snapshot and player archive. The local development repository's history is not the public distribution.

The 13 small status icons under `content/abilities/*/resources/assets/world_combat/textures/mob_effect/` were procedurally drawn from original geometric shapes and palettes by this project's content authors. Their generation records have been traced; no external source images were read or downloaded. They are original project assets covered by the project's license; drawing sources are in `tools/artwork/`.

## Build tools

The source tree includes the Gradle Wrapper, licensed under [Apache-2.0](https://github.com/gradle/gradle/blob/master/LICENSE). Gradle is fetched separately. Kotlin and TypeScript are separately downloaded Apache-2.0 development tools. Their upstream copyright and license notices remain applicable. Standard license texts are included in `LICENSES/`; the original dependency distributions carry their own notices and any additional permissions.

When distributing WorldCombat binaries, accompany them with the matching, complete buildable source archive or provide the corresponding source through the same download location. Keep these notices and the applicable license texts with the distribution.
