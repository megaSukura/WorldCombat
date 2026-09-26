/**
 * 十字毒刃 / crosspoison 的出手方式。
 *
 * 核心念头：两片毒刃从左右分开、在对手身上**同时**合拢剪出一个 X；两条刃同刻各检测一遍，
 *   被两条刃共同覆盖的正中目标吃满一记、并按更高的概率中毒，只被一条刃擦到的侧边目标吃折扣、毒也更难上。
 *
 * 两幕：
 *   起（windup，提交前）：两片毒刃在身前左右分开、刃口滴毒，只播预告。
 *   剪（execute → slit / cut / seal / venom / miss）：提交后两刃同时合拢，各自沿对角线做一次真实检测：
 *       被两条刃共同覆盖（交点，即准心的正中目标）结算 `slit`、按 `sealChance` 中毒；
 *       只被一条刃擦到结算 `slit × share`、按 `poisonChance` 中毒。每个目标至多结算一次毒。
 *       任一条刃撞上墙体就缩短到墙面，线条后面的目标划不到；两刃之间那条窄线由 `spread` 决定。
 *
 * 与同族分开：十字劈是两道劈击从斜上方**先后**落下、第一劈为第二劈撞开架势；十字毒刃是两刃从左右**同时**合拢的一剪，
 *   凭两条刃是否共同覆盖交点来决定伤与毒；毒尾是绕身半圈的低扫。
 *
 * 选取 kind: "aim"：可点敌人、也可只朝一个方向瞄交点，空剪只留空响。
 *
 * 配置 corrode（腐蚀式）由 resolve 改时序、由公式改威力/中毒/毒率，提交后才触碰世界。
 */
namespace PokemonSkills {
    const crosspoisonScene = "world_combat:move_crosspoison";
    const crosspoisonHitText = "world_combat.move.crosspoison.text.hit";
    const crosspoisonVenomText = "world_combat.move.crosspoison.text.venom";
    const crosspoisonMissText = "world_combat.move.crosspoison.text.miss";

    /** 一道斜刃的两个端点：在过交点、垂直于瞄准方向的平面里从一角划到对角。 */
    function crosspoisonBlade(centre: CombatPoint, lateral: CombatPoint, up: CombatPoint, spread: number, rising: boolean): CombatPoint[] {
        const a = centre.plus(lateral.scale(-spread)).plus(up.scale(rising ? -spread * 0.8 : spread * 0.8));
        const b = centre.plus(lateral.scale(spread)).plus(up.scale(rising ? spread * 0.8 : -spread * 0.8));
        return [a, b];
    }

    /** 一段刃线的两个顶点，供表现与判定读同一组位置。 */
    function crosspoisonSegment(from: CombatPoint, to: CombatPoint): number[][] {
        return [[from.x(), from.y(), from.z()], [to.x(), to.y(), to.z()]];
    }

    /** 把一条刃的两端裁到最先撞到的方块面：墙分别截住两道刃，后面的目标划不到。 */
    function crosspoisonClip(world: CombatWorld, a: CombatPoint, b: CombatPoint): CombatPoint[] {
        let near = a, far = b;
        const forward = world.clipBlocks(a, b);
        if (forward !== null && forward.blocked()) {
            const face = forward.blockPosition(), span = b.minus(a).length();
            if (face !== null && face.minus(a).length() < span - 1e-6) far = face;
        }
        const backward = world.clipBlocks(far, near);
        if (backward !== null && backward.blocked()) {
            const face = backward.blockPosition(), span = far.minus(near).length();
            if (face !== null && face.minus(near).length() < span - 1e-6) near = face;
        }
        return [near, far];
    }

    define({
        id: "crosspoison",
        cooldownParameter: "recharge",
        name: "Cross Poison",
        description: "两片毒刃从左右同时合拢，在瞄点剪出一个 X：被两条刃共同覆盖的目标吃满一记、按较高的概率中毒，只被一条刃擦到的目标吃折扣、毒也更难上。可以点敌人或只朝一个方向瞄交点，空剪只留空响。腐蚀式更毒但剪得更轻；快刃式剪得更重但毒难按进去。",
        uses: ["同时合拢的一剪、终结一个目标", "顺手划到挤在交点两侧的敌人", "让正中目标按更高概率中毒"],
        kind: "aim",
        range: 2.5,
        maxRange: 3.6,
        prepare: 7,
        active: 16,
        recover: 6,
        cooldown: 20,
        style: "venom",
        maximumTicks: 220,
        defaults: { corrode: false, ai: { maxChase: 6, preferUnpoisoned: true, preferPair: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p("crosspoison", "reach", pokemon) : 2.5, geometry: "line", style: "venom",
                color: 0x9BE86B, label: config && config.corrode === true ? "十字毒刃·腐蚀式" : "十字毒刃" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["crosspoison"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("crosspoison", "tempo", context)),
                recover: Math.round(p("crosspoison", "settle", context)),
                cooldown: Math.round(p("crosspoison", "recharge", context)),
                active: skills["crosspoison"].active,
                range: p("crosspoison", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            const drops = Math.max(6, Math.round(p("crosspoison", "drops", action) * 0.6));
            action.present("crosspoison:spread", crosspoisonScene, 1, action.origin(),
                JSON.stringify({ moment: "spread", windup: prepare, drops: drops, corrode: config && config.corrode ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const origin = body === null ? action.origin() : body.position();
            const heading = aim(action);
            const target = action.target();
            const targetBody = target !== null && world.valid(target) ? world.observe(target) : null;
            const reach = Math.max(2.0, action.range());
            const slit = p("crosspoison", "slit", action);
            const spread = p("crosspoison", "spread", action);
            const share = p("crosspoison", "share", action);
            const chance = p("crosspoison", "poisonChance", action);
            const sealChance = p("crosspoison", "sealChance", action);
            const venomTicks = Math.max(60, Math.round(p("crosspoison", "venomTicks", action)));
            const drops = Math.max(8, Math.round(p("crosspoison", "drops", action)));
            const scale = Math.max(0.6, Math.min(1.8, spread / 0.7));
            const intensity = Math.max(0.6, Math.min(2.2, slit / 70));
            const centre = targetBody !== null ? targetBody.position() : origin.plus(heading.scale(reach));
            const lateral = WorldCombat.point(-heading.z(), 0, heading.x());
            const up = WorldCombat.point(0, 1, 0);
            const gauge = Math.max(0.2, Math.min(0.6, spread * 0.45));
            // 两条交叉的刃，同刻各检测一次；各自被墙截断后仍保留交叉点。
            const clipped = [
                crosspoisonClip(world, crosspoisonBlade(centre, lateral, up, spread, true)[0], crosspoisonBlade(centre, lateral, up, spread, true)[1]),
                crosspoisonClip(world, crosspoisonBlade(centre, lateral, up, spread, false)[0], crosspoisonBlade(centre, lateral, up, spread, false)[1])
            ];
            const covers: { [ref: string]: { actor: CombatActor; count: number } } = Object.create(null);

            function cover(from: CombatPoint, to: CombatPoint): void {
                if (from.minus(to).length() < 1e-6) return;
                WorldGeometry.selectBodies(world, WorldGeometry.bodySegment(from, to, gauge), function (victim: CombatActor) {
                    const ref = String(victim.ref());
                    if (ref === String(actor.ref()) || world.friendly(victim)) return;
                    if (!covers[ref]) covers[ref] = { actor: victim, count: 0 };
                    covers[ref].count++;
                });
            }

            sound(action, "minecraft:entity.player.attack.sweep");
            WorldFeedback.emit(world, crosspoisonScene, 1, centre,
                { moment: "slit", path: crosspoisonSegment(clipped[0][0], clipped[0][1]), drops: drops, scale: scale,
                    intensity: intensity, direction: [heading.x(), heading.y(), heading.z()], blade: 0 }, 18);
            WorldFeedback.emit(world, crosspoisonScene, 1, centre,
                { moment: "slit", path: crosspoisonSegment(clipped[1][0], clipped[1][1]), drops: drops, scale: scale,
                    intensity: intensity, direction: [heading.x(), heading.y(), heading.z()], blade: 1 }, 18);

            cover(clipped[0][0], clipped[0][1]);
            cover(clipped[1][0], clipped[1][1]);

            const refs = Object.keys(covers);
            let hits = 0, sealed = 0, poisoned = 0;
            for (let index = 0; index < refs.length; index++) {
                const entry = covers[refs[index]], victim = entry.actor, both = entry.count >= 2;
                const powerValue = both ? slit : slit * share;
                const landed = hurt(action, victim, "crosspoison", powerValue,
                    { damage: damageSpec("crosspoison", "slit"), contact: true });
                const now = world.observe(victim);
                const at = now === null ? centre : now.position();
                WorldFeedback.emit(world, crosspoisonScene, 1, at,
                    { moment: "cut", target: String(victim.ref()), drops: drops, scale: scale, both: both ? 1 : 0,
                        intensity: Math.max(0.5, Math.min(2.2, powerValue / 70)) }, 20);
                if (!landed || !world.valid(victim)) continue;
                hits++;
                if (both) sealed++;
                world.sound("cobblemon:impact.poison", at, 14, "{}");
                // 每个目标只结算一次毒：共同覆盖走交点毒率，单刃擦到走擦边毒率。
                const chanceValue = both ? sealChance : chance;
                if (world.random() < chanceValue && CombatStatus.inflict(world, victim, "poison", venomTicks, 0, { secondary: true })) {
                    poisoned++;
                    WorldFeedback.emit(world, crosspoisonScene, 1, at,
                        { moment: "venom", target: String(victim.ref()), drops: drops, scale: scale, both: both ? 1 : 0 }, 20);
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), crosspoisonVenomText, [], 22);
                } else if (both) {
                    WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), crosspoisonHitText, [], 20);
                }
            }

            // 只有真正有目标被两条刃共同覆盖，才补上 X 成形的收束一幕。
            if (sealed > 0) WorldFeedback.emit(world, crosspoisonScene, 1, centre,
                { moment: "seal", path: crosspoisonSegment(clipped[0][0], clipped[0][1]), drops: drops, scale: scale,
                    intensity: intensity, struck: sealed, venom: poisoned }, 20);
            if (hits === 0) {
                WorldFeedback.emit(world, crosspoisonScene, 1, centre, { moment: "miss", scale: scale }, 16);
                WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.0, 0)), crosspoisonMissText, [], 20);
                sound(action, "cobblemon:move.gust.actor");
            }
            done(action);
        }
    });
}
