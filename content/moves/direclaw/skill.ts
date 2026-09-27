/**
 * 克命爪 / direclaw 的出手方式。
 *
 * 核心念头：朝瞄准方向一记深爪，三道爪痕同时犁开身前最近那个**可达**的敌人——爪上的余毒在收爪那一刻**挑一种**诅咒按进去。
 *   伤害只结算一次，状态只掷取一次、只尝试一次；三选一的结果由爪上的毒决定，是这一招的身份。
 *
 * 骨牌（外加一次结果）：
 *   起（windup，提交前）：爪锋压上毒液、三道冷光朝真实朝向在身前亮起，只播预告，可被打断。
 *   撕（blade）：提交后三道短刃从手边朝目标推进；每刻只画当前真实的一小段，判定用同一组端点。
 *   留痕（gash／venom／numb／drowse／wound）：只有 `hurt` 真正落地时才在伤口画下三道平行爪痕；命中后按
 *       `ailmentChance` 掷一次，从中毒／麻痹／睡眠里挑一种按进伤口（`favor` 可提前指定倾向）；目标免疫则只留一下毒雾，
 *       不再轮试另外两种。落空或零伤（免疫）不留成功伤痕。
 *
 * 与同族分开：十字毒刃是两刃合拢、靠会渗的毒；克命爪是**一记深爪、一次掷取三选一**，伤害与状态都不拖泥带水。
 *
 * 自由瞄准：`kind: "aim"` 可选任意阵营实体或方向（含竖直瞄准）；真实短爪扇取身前最近可达者，墙后与够不到的会被跳过。
 *   命中、防御、相性走共享 `hurt`；「瞄准要害」在共享暴击档之外再给一次独立机会（`PokemonDamage.metadata`），
 *   免疫暴击不绕过；余毒走 `CombatStatus.inflict`，一次只试一种。
 */
namespace PokemonSkills {
    /** 余毒身份 → 浮字键。 */
    function direclawAilmentText(name: string): string {
        if (name === "poison") return direclawPoisonText;
        if (name === "paralysis") return direclawParalysisText;
        return direclawSleepText;
    }
    /** 余毒身份 → 表现 moment（三色分开，画面才读得出中的是哪一种）。 */
    function direclawAilmentMoment(name: string): string {
        if (name === "poison") return "venom";
        if (name === "paralysis") return "numb";
        return "drowse";
    }
    /** 一条爪痕：伤口平面里从下往上、略带前倾的一段线，服务端与画面共用这组顶点。 */
    function direclawGash(centre: CombatPoint, lateral: CombatPoint, up: CombatPoint, offset: number, cleave: number): number[][] {
        const low = centre.plus(lateral.scale(offset)).plus(up.scale(-cleave * 0.45));
        const high = centre.plus(lateral.scale(offset)).plus(up.scale(cleave * 0.75));
        return [[low.x(), low.y(), low.z()], [high.x(), high.y(), high.z()]];
    }

    // 「瞄准要害」接入共享暴击结算：在共享暴击档之外，再按本招 critChance 独立掷一次；两者任一成立即暴击，
    // 免疫暴击（criticalChance 已被压成 0）时不绕过。这是公开的第二次机会，而非覆盖共享骰子。
    PokemonDamage.metadata.define({
        id: "world_combat:move_direclaw/aimed",
        applies: function (context: PokemonDamage.MetadataContext): boolean {
            const data: any = context.metadata;
            return !context.preview && !!context.world && !!context.action && !!data && String(data.move) === direclawId;
        },
        apply: function (context: PokemonDamage.MetadataContext): void {
            const data: any = context.metadata;
            if (data.critical === true) return;
            const base = typeof data.criticalChance === "number" && isFinite(data.criticalChance) ? data.criticalChance : 0;
            if (!(base > 0) || base >= 1) return;
            const action = context.action;
            if (!action) return;
            const extra = Math.max(0, Math.min(0.95, p(direclawId, "critChance", action)));
            if (!(extra > 0)) return;
            const combined = 1 - (1 - base) * (1 - extra);
            if (!(combined > base)) return;
            data.criticalChance = combined;
            if ((<CombatWorld>context.world).random() < (combined - base) / (1 - base)) data.critical = true;
        }
    });

    define({
        id: direclawId,
        cooldownParameter: "recharge",
        name: "Dire Claw",
        description: "朝瞄准方向一记深爪，三道短刃从手边推进到身前最近可达的敌人身上，同时犁开三道爪痕；命中后从中毒、麻痹、睡眠里挑一种按进伤口（只掷一次、只试一种）。墙后的敌人不会被隔墙抓中。这一爪瞄准要害：在原生暴击之外再按自己的几率找一次要害。开启深创更重留毒、关闭则更重伤害；余毒倾向可以指定要按哪一种。",
        uses: ["近身一记深爪，把三选一的余毒按进伤口", "对高危目标指定留下睡眠", "对准要害打出更高暴击的一爪"],
        kind: "aim",
        range: 2.8,
        maxRange: 4.0,
        prepare: 7,
        active: 0,
        recover: 6,
        cooldown: 26,
        style: "venom",
        stationary: true,
        defaults: { deep: false, favor: 0, ai: { maxChase: 6, preferUnfazed: true } },
        fields: [],
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills[direclawId], detail: { values: config } };
            return { radius: p(direclawId, "reach", context), geometry: "line", style: "venom", color: 0x9BE86B,
                label: config && config.deep === true ? "克命爪·深创" : "克命爪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[direclawId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(direclawId, "tempo", context)),
                recover: Math.round(p(direclawId, "aftercast", context)),
                cooldown: Math.round(p(direclawId, "recharge", context)),
                active: 0,
                range: p(direclawId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const ven = Math.max(10, Math.round(p(direclawId, "venom", action) * 0.5));
            const heading = WorldGeometry.flatUnit(aim(action));
            action.present("direclaw:windup:" + action.id(), direclawScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", windup: prepare, venom: ven,
                    direction: [heading.x(), heading.y(), heading.z()],
                    deep: config && config.deep === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const scenes = WorldFeedback.actionScenes(direclawScene);
            const world = action.world();
            const actor = action.actor();
            const self = world.observe(actor);
            if (self === null) { done(action); return; }
            const origin = self.position();
            const direction = aim(action);
            const frame = WorldGeometry.basis(direction);
            const forward = frame.forward, right = frame.right, up = frame.up;
            const reach = Math.max(1.8, action.range());
            const power = p(direclawId, "rake", action);
            const chance = p(direclawId, "ailmentChance", action);
            const ticks = Math.max(40, Math.round(p(direclawId, "ailmentTicks", action)));
            const cleave = Math.max(0.3, p(direclawId, "cleave", action));
            const wound = Math.max(0.2, p(direclawId, "wound", action));
            const venom = Math.max(10, Math.round(p(direclawId, "venom", action)));
            const gashes = Math.max(1, Math.round(p(direclawId, "gashes", action)));
            const favour = Math.max(0, Math.min(3, Math.round(Number(config && config.favor) || 0)));
            const scale = Math.max(0.6, Math.min(1.8, cleave / direclawReference));
            const intensity = Math.max(0.6, Math.min(2.2, power / 80));
            const selfRef = String(actor.ref());
            const handReach = 0.35 + self.width() * 0.25;
            const handRise = Math.min(0.9, cleave * 0.4);
            const handAt = self.position().plus(forward.scale(handReach)).plus(up.scale(handRise));

            // 真实短爪扇：实际的实体箱相交，从中取最近的可达者；墙后或够不到的会被跳过，选中的目标优先保留。
            const reachable: { victim: CombatActor; facts: CombatObservation; contact: CombatPoint; gap: number }[] = [];
            WorldGeometry.selectBodies(world, WorldGeometry.bodySector(origin, forward, reach, 78,
                { below: self.height() / 2, above: self.height() * 0.6 + cleave }),
                function (candidate: CombatActor, facts: CombatObservation) {
                    const ref = String(candidate.ref());
                    if (ref === selfRef || world.friendly(candidate)) return;
                    const contact = world.closestPoint(candidate, origin);
                    if (!world.clear(origin, contact)) return;
                    reachable.push({ victim: candidate, facts: facts, contact: contact, gap: contact.minus(origin).length() });
                });
            const chosen = action.target();
            let picked: { victim: CombatActor; facts: CombatObservation; contact: CombatPoint; gap: number } | null = null;
            if (chosen !== null) {
                for (let i = 0; i < reachable.length; i++)
                    if (String(reachable[i].victim.ref()) === String(chosen.ref())) { picked = reachable[i]; break; }
            }
            if (picked === null)
                for (let i = 0; i < reachable.length; i++) if (picked === null || reachable[i].gap < picked.gap) picked = reachable[i];
            if (picked === null) {
                const air = origin.plus(forward.scale(reach));
                WorldFeedback.emit(world, direclawScene, 1, air, { moment: "miss", venom: venom, scale: scale }, 18);
                WorldFeedback.text(world, air.plus(WorldCombat.point(0, 0.9, 0)), direclawMissText, [], 20);
                done(action);
                return;
            }

            const woundPoint = world.closestPoint(picked.victim, handAt);
            const targetCentre = picked.facts.position();
            const gap = gashes > 1 ? wound * 2 / (gashes - 1) : 0;
            const travel = woundPoint.minus(handAt);
            const steps = 3;
            let settled = false;

            sound(action, "minecraft:entity.player.attack.sweep");

            /** 当前一刻：只画刚推进到的那一小段三道短刃，与服务端判定共用 hand/wound 这组端点。 */
            function advance(current: CombatAction, index: number): void {
                if (settled) return;
                const scope = current.world();
                const live = scope.observe(actor);
                const base = live === null ? current.origin() : live.position();
                const hand = base.plus(forward.scale(handReach)).plus(up.scale(handRise));
                const from = index / steps, to = Math.min(1, (index + 1) / steps + 0.2);
                for (let g = 0; g < gashes; g++) {
                    const offset = gashes > 1 ? -wound + gap * g : 0;
                    const lateral = right.scale(offset);
                    const low = hand.plus(lateral).plus(travel.scale(from));
                    const high = hand.plus(lateral).plus(travel.scale(to));
                    scenes.show(current, "blade" + g, base, { moment: "blade",
                        path: [[low.x(), low.y(), low.z()], [high.x(), high.y(), high.z()]],
                        venom: venom, scale: scale, intensity: intensity, primary: g === Math.floor(gashes / 2) ? 1 : 0 });
                }
                if (index + 1 < steps) { current.after(1, function (next: CombatAction) { advance(next, index + 1); }); return; }
                finish(current);
            }

            function finish(current: CombatAction): void {
                if (settled) return;
                settled = true;
                const scope = current.world();
                const landed = hurt(current, picked!.victim, direclawId, power,
                    { damage: damageSpec(direclawId, "rake"), contact: true });
                if (!landed) {
                    WorldFeedback.emit(scope, direclawScene, 1, targetCentre, { moment: "miss", venom: venom, scale: scale }, 18);
                    WorldFeedback.text(scope, targetCentre.plus(WorldCombat.point(0, 0.9, 0)), direclawMissText, [], 20);
                    scenes.finish(current, done);
                    return;
                }
                // 命中才留痕：三道爪痕画在真实伤口处；若中间被墙截断，痕落在阻挡面上。
                const wall = WorldGeometry.blockHit(scope, handAt, targetCentre);
                const scar = wall === null ? targetCentre : wall.position();
                for (let g = 0; g < gashes; g++) {
                    const offset = gashes > 1 ? -wound + gap * g : 0;
                    WorldFeedback.emit(scope, direclawScene, 1, scar, { moment: "gash",
                        path: direclawGash(scar, right, up, offset, cleave), venom: venom, scale: scale,
                        intensity: intensity, primary: g === Math.floor(gashes / 2) ? 1 : 0 }, 20);
                }
                // 余毒：只掷一次是否留下；留下就按倾向或随机挑一种身份只试一次，免疫不轮试另外两种。
                let ailment = "";
                if (scope.random() < chance) {
                    ailment = favour >= 1 ? direclawFavours[favour] : direclawFavours[1 + Math.floor(scope.random() * 3)];
                    const before = CombatStatus.has(scope, picked!.victim, ailment);
                    if (CombatStatus.inflict(scope, picked!.victim, ailment, ticks, 0, { secondary: true }) && !before) {
                        WorldFeedback.emit(scope, direclawScene, 1, scar, { moment: direclawAilmentMoment(ailment),
                            target: String(picked!.victim.ref()), venom: venom, scale: scale, intensity: intensity }, 24);
                        scope.sound("cobblemon:impact.poison", scar, 14, "{}");
                        WorldFeedback.text(scope, scar.plus(WorldCombat.point(0, 1.1, 0)), direclawAilmentText(ailment), [], 24);
                        scenes.finish(current, done);
                        return;
                    }
                }
                WorldFeedback.emit(scope, direclawScene, 1, scar, { moment: "wound", target: String(picked!.victim.ref()),
                    venom: Math.round(venom * 0.6), scale: scale, intensity: intensity }, 20);
                WorldFeedback.text(scope, scar.plus(WorldCombat.point(0, 1.1, 0)),
                    ailment ? direclawNoAilmentText : direclawHitText, [], 22);
                scope.sound("cobblemon:impact.poison", scar, 14, "{}");
                scenes.finish(current, done);
            }

            advance(action, 0);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记强调与浮字（暴击率来自共享暴击档 + 本招 critChance 的独立机会）。
    WorldCombat.on("world_combat:move_direclaw/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== direclawId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z);
        WorldFeedback.emit(world, direclawScene, 1, at,
            { moment: "crit", target: String(target.ref()), venom: 18, scale: 1.1 }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), direclawCritText, [], 28);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
