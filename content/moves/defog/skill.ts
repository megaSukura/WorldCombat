/**
 * 清除浓雾 / Defog —— 出手方式。
 *
 * 核心念头：以自身为轴旋起一圈清扫风，朝四面推出去；风圈扫过的地方，对手身上的屏障被整片抹掉、
 *   地上的烟与撒菱被掀走，圈里的对手被吹得门户大开（闪避下降，破绽只在有效期内）。这是本族唯一
 *   「不打人、只打扫」的一招。
 *
 * 一幕半：
 *   起（windup，提交前）：脚边气流开始打旋、粉尘贴地聚起，预告这一圈风（`action.present`）。
 *   扫（burst → strip）：提交后风圈从自身向外铺开半径 `sweep`：先把自方与圈内活体身上的烟幕吹散（空周边也先
 *     清自己），圈里的非友方身上的反射壁、光墙、极光幕、白雾、神秘守护一起被解除（共享身份 `cure`），
 *     被扫到的对手闪避下降 `strip`——这次下降挂在真正的 `world_combat:defog_exposed` 载体上，载体在多久
 *     就降多久，到期/被清除时由共享等级窗口原样收回，不再留下永久阶段；只有真正降下去的那一下才挂
 *     world_combat:status/defogged 破绽并显示门户线。风还掀掉风带里的烟幕场地与撒菱／隐形岩／黏网／毒菱
 *     场地（双方都清、按 id 去重），被墙挡住的、破不开的都不算已清。全程没有伤害、没有击退。
 *
 * 与同族分开：吹飞是把人沿风向推走的逐退，劈瓦是贴身一记把屏障震碎；只有清除浓雾是**以自身为轴、
 *   大范围、无伤害**的打扫——它抹掉的是「守势」而不是「位置」或「血量」。
 * 反制：风圈是以施法者为圆心的圆，站到半径之外就什么都不受影响；风也会顺手掀掉自方的撒菱与烟幕。
 */
namespace PokemonSkills {
    const defogScene = "world_combat:move_defog";
    const defogExposed = "world_combat:defog_exposed";
    const defogContribution = "world_combat:move/defog";
    const defogStripText = "world_combat.move.defog.text.strip";
    const defogClearText = "world_combat.move.defog.text.clear";
    const defogGustText = "world_combat.move.defog.text.gust";
    const defogHazeText = "world_combat.move.defog.text.haze";

    /** 共享身份：这一扫会从对手身上抹掉的屏障。 */
    const defogScreens = ["reflect", "lightscreen", "auroraveil", "mist", "safeguard"];
    /** 会被风掀掉的场地类别：烟幕、护幕与入场陷阱；由生产者声明，本招不枚举规则 id。 */
    const defogFieldTags = [WorldEffects.categories.haze, WorldEffects.categories.screen, WorldEffects.categories.hazard];

    /** 这块场地是不是自己／盟友布下的；清掉它对本方是纯损失。 */
    function defogOwned(world: CombatWorld, self: CombatActor, area: WorldEffects.Area): boolean {
        if (area.source === String(self.ref())) return true;
        const owner = world.actor(area.source);
        return owner !== null && world.valid(owner) && world.allied(self, owner);
    }

    /** 破除 actor 身上的一个屏障身份；返回真正移除的身份数。 */
    function defogPurgeActor(world: CombatWorld, actor: CombatActor): number {
        let removed = 0;
        for (let i = 0; i < defogScreens.length; i++) {
            const name = defogScreens[i];
            if (!CombatStatus.has(world, actor, name)) continue;
            if (CombatStatus.cure(world, actor, name)) removed++;
        }
        return removed;
    }

    /** 会被这一扫吹散的遮蔽身份：烟幕。自己和友方身上的烟也一并散，不需要先看见敌人。 */
    function defogCureHaze(world: CombatWorld, actor: CombatActor): boolean {
        if (!CombatStatus.has(world, actor, "smoked")) return false;
        if (!CombatStatus.cure(world, actor, "smoked")) return false;
        const body = world.observe(actor);
        if (body !== null)
            WorldFeedback.emit(world, defogScene, 1, body.position(), { moment: "haze", target: String(actor.ref()) }, 24);
        return true;
    }

    /**
     * 只读扫描：风圈（水平圆带、高度落带、墙挡不算）里、声明为烟幕／护幕／陷阱类别的真实场地，
     * 按效果 id 去重后分成「非己方」与「己方」两组。判定与 AI 共用这一份事实。
     */
    export function defogFieldScan(world: CombatWorld, centre: CombatPoint, radius: number): { enemy: WorldEffects.Area[]; own: WorldEffects.Area[] } {
        const result: { enemy: WorldEffects.Area[]; own: WorldEffects.Area[] } = { enemy: [], own: [] };
        const seen: { [id: string]: boolean } = {};
        const self = world.source();
        for (let r = 0; r < defogFieldTags.length; r++) {
            const areas = WorldEffects.areasWithTag(world, defogFieldTags[r], centre, radius);
            for (let i = 0; i < areas.length; i++) {
                const area = areas[i], key = String(area.id);
                if (seen[key]) continue;
                seen[key] = true;
                const at = WorldCombat.point(area.position[0], area.position[1], area.position[2]);
                if (at.y() < centre.y() - 3 || at.y() > centre.y() + 4) continue;
                if (at.minus(centre).length() > radius + area.radius) continue;
                if (!world.clear(centre, at)) continue;
                (defogOwned(world, self, area) ? result.own : result.enemy).push(area);
            }
        }
        return result;
    }

    define({
        id: "defog",
        cooldownParameter: "recharge",
        name: "Defog",
        description: "以自身为轴旋起一圈清扫风：圈里对手的反射壁、光墙、极光幕、白雾与神秘守护被整片抹掉，"
            + "地上的烟幕与撒菱一并掀走，被扫到的对手门户大开（闪避下降一段短时间）。没有伤害，站到风圈之外就无事。",
        uses: ["把对手张开的屏障整片吹掉", "被烟幕或撒菱困住时一场清干净", "给全队的下一轮攻击开一个破绽窗口"],
        kind: "self",
        range: 6,
        maxRange: 12,
        prepare: 9,
        active: 1,
        recover: 7,
        cooldown: 30,
        style: "wind",
        stationary: true,
        defaults: { gale: false, ai: { maxChase: 10, minFoes: 2, leaveStation: true } },
        fields: [flag("gale", "烈风")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["defog"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("defog", "tempo", context)),
                recover: Math.round(p("defog", "aftercast", context)),
                cooldown: Math.round(p("defog", "recharge", context)),
                active: 1,
                range: p("defog", "sweep", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_defog:gather", defogScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", intensity: config && config.gale === true ? 1.3 : 1 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["defog"], detail: { values: config } };
            return { radius: p("defog", "sweep", context), geometry: "area", style: "wind", color: 0xBFE4E8,
                label: config && config.gale === true ? "清除浓雾·烈风" : "清除浓雾" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor();
            const body = world.observe(self);
            const origin = body === null ? action.origin() : body.position();
            const sweep = Math.max(4, p("defog", "sweep", action));
            const strip = Math.max(1, Math.min(3, Math.round(p("defog", "strip", action))));
            const ticks = Math.max(90, Math.round(p("defog", "linger", action)));
            const motes = Math.max(12, Math.round(p("defog", "motes", action)));
            const scale = sweep / 6;
            let caught = 0, clipped = 0, hazed = 0;

            sound(action, "minecraft:entity.breeze.whirl");
            WorldFeedback.emit(world, defogScene, 1, origin,
                { moment: "burst", motes: motes, scale: scale }, 30);
            // 空周边也要先把自己身上的遮蔽吹散：遮蔽解除与是否看得见敌人无关。
            if (defogCureHaze(world, self)) hazed++;
            WorldGeometry.select(world, WorldGeometry.ring(origin, 0, sweep, { below: 3, above: 4 }), function (actor, facts) {
                if (String(actor.ref()) === String(self.ref())) return;
                // 风贴着地面绕墙走：中间被方块挡住的身体不算在风圈里。
                if (!world.clear(origin, facts.position())) return;
                if (defogCureHaze(world, actor)) hazed++;
                if (facts.friendly()) return;
                caught++;
                const purged = defogPurgeActor(world, actor);
                clipped += purged;
                // 闪避下降挂在本招自己的破绽载体上：载体在多久就降多久，到期/被清由共享窗口原样收回。
                const previous = MobEffects.read(world, actor, defogExposed);
                const carrier = MobEffects.apply(world, actor, defogExposed, ticks, 0);
                let stripped = 0;
                if (carrier !== null) {
                    const before = NativeEffects.effectiveStage(world, actor, "evasion");
                    const windowId = NativeEffects.boostWindow(world, actor, { evasion: -strip }, ticks, defogContribution, carrier, previous);
                    stripped = Math.max(0, before - NativeEffects.effectiveStage(world, actor, "evasion"));
                    if (!windowId || stripped === 0) {
                        if (windowId) NativeEffects.windowClose(world, windowId);
                        MobEffects.consume(world, actor, defogExposed);
                    } else {
                        WorldFeedback.onEffect(world, windowId, "world_combat:move_defog/opened:" + String(actor.ref()),
                            defogScene, 1, facts.position(), { moment: "opened", target: String(actor.ref()), stripped: stripped });
                    }
                }
                if (stripped > 0 || purged > 0) {
                    const away = facts.position().minus(origin);
                    const direction = away.length() < 0.05 ? WorldCombat.point(0, 0, 1) : away.unit();
                    WorldFeedback.emit(world, defogScene, 1, facts.position(),
                        { moment: "strip", target: String(actor.ref()),
                          direction: [direction.x(), direction.y(), direction.z()],
                          peeled: purged > 0 ? Math.max(6, purged * 5) : 0,
                          motes: Math.max(8, Math.round(motes * 0.5)),
                          opened: stripped > 0 ? Math.max(8, stripped * 6) : 0, scale: scale }, 26);
                    if (stripped > 0)
                        WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.1, 0)), defogStripText, [stripped], 28);
                }
            });
            // 场地按真实 id 去重后逐处掀掉；每处真正被 dispel 才在它的位置散烟碎屏。
            const fields = defogFieldScan(world, origin, sweep);
            const clearedAreas = fields.enemy.concat(fields.own);
            let fieldCount = 0;
            for (let i = 0; i < clearedAreas.length; i++) {
                const area = clearedAreas[i];
                const at = WorldCombat.point(area.position[0], area.position[1], area.position[2]);
                if (!world.operation(area.id, "world_combat:dispel", "{}")) continue;
                fieldCount++;
                WorldFeedback.emit(world, defogScene, 1, at,
                    { moment: "field", motes: Math.max(8, Math.round(motes * 0.5)), scale: scale,
                      own: defogOwned(world, self, area) ? 1 : 0 }, 24);
            }
            sound(action, "minecraft:entity.breeze.wind_burst");
            WorldFeedback.emit(world, defogScene, 1, origin,
                { moment: "clear", motes: motes, cleared: Math.max(0, clipped + fieldCount), scale: scale }, 28);
            if (clipped + fieldCount > 0)
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), defogClearText, [clipped, fieldCount], 30);
            else if (hazed > 0)
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), defogHazeText, [hazed], 26);
            else
                WorldFeedback.text(world, origin.plus(WorldCombat.point(0, 1.3, 0)), defogGustText, [caught], 26);
            done(action);
        }
    });
}
