/**
 * 暗影爪 / shadowclaw 的出手方式。
 *
 * 核心念头：脚下的影子先贴着地面朝对手铺出去，绕过它、在它身后站起来；一只影爪从那一端反向抓回来，
 * 从对手照不到的一面抓进要害。正面挡没用，因为爪不是从正面来的。
 *
 * 两幕：
 *   起（windup，提交前）：影子在脚边聚拢，只播预告，可被打断。
 *   铺与抓（shade → rend，提交后）：影子从脚下铺到目标身后 `shade` 格处，一条暗带经过目标脚下；
 *       影爪从暗带末端抓向目标，结算 `rend` 接触伤害。若目标当前正攻击别人（没在看施法者），
 *       这一爪吃满 `ambush` 加成，画面更深。
 *   空（miss）：没有目标或没抓到时，暗带照旧铺出，末端只留一道抓空的风。
 *   要害（crit）：共享结算判定为暴击时，由本单元的监听器在命中点补一记更亮的要害标记。
 *
 * 与同族分开：劈开是从自己头顶沿身前走廊压下去的重劈，直冲钻是旋转着撞进去，精神利刃与水波刀是掷出去的刃；
 * 只有暗影爪的出手点不在施法者身上——爪从目标背后的影子里来，且专挑对手没看它的那一刻。
 */
namespace PokemonSkills {
    /** 影铺出的暗带：从 origin 沿 direction 铺到目标身后 anchor，半宽 half；判定与表现共用同一组顶点。 */
    function shadowclawBand(origin: CombatPoint, direction: CombatPoint, aimed: CombatPoint, shade: number,
        half: number): number[][] {
        const forward = WorldCombat.point(direction.x(), 0, direction.z());
        const heading = forward.length() < 1e-6 ? WorldCombat.point(0, 0, 1) : forward.unit();
        const side = WorldCombat.point(-heading.z(), 0, heading.x());
        const anchor = aimed.plus(heading.scale(shade));
        const start = origin.minus(heading.scale(0.2));
        return [start.plus(side.scale(half)), start.minus(side.scale(half)),
            anchor.minus(side.scale(half)), anchor.plus(side.scale(half))]
            .map(function (point) { return [point.x(), point.y(), point.z()]; });
    }

    /** 影爪的一记抓痕：从暗带末端 anchor 反向抓回目标点。 */
    function shadowclawStroke(anchor: CombatPoint, aimed: CombatPoint): number[][] {
        return [[anchor.x(), anchor.y(), anchor.z()], [aimed.x(), aimed.y(), aimed.z()]];
    }

    define({
        id: shadowclawId,
        name: "Shadow Claw",
        description: "The user slashes with a sharp claw made from shadows. This move has a heightened chance of landing a critical hit.",
        uses: ["影子绕到对手背后伸爪", "对手没在看自己时这一爪更重", "沿用原生高暴击，命中留影痕"],
        kind: "enemy",
        range: 2.6,
        maxRange: 3.4,
        prepare: 8,
        active: 18,
        recover: 8,
        cooldown: 32,
        style: "ghost",
        defaults: { deep: false, ai: { maxChase: 6, strikeUnseen: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p(shadowclawId, "reach", pokemon), geometry: "line", style: "ghost", color: 0x8E7BD8,
                label: config && config.deep === true ? "深影爪" : "暗影爪" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon: pokemon, skill: skills[shadowclawId], detail: { values: config },
                world: world || null, actor: actor || null, attributes: attributes };
            return {
                prepare: Math.round(p(shadowclawId, "tempo", context)),
                recover: Math.round(p(shadowclawId, "aftercast", context)),
                cooldown: Math.round(p(shadowclawId, "recharge", context)),
                active: skills[shadowclawId].active,
                range: p(shadowclawId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_shadowclaw:windup", shadowclawScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", deep: config && config.deep === true, windup: prepare }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const direction = aim(action);
            const self = world.observe(actor);
            const origin = self === null ? action.origin() : self.position();
            const reach = p(shadowclawId, "reach", action);
            const shade = p(shadowclawId, "shade", action);
            const half = p(shadowclawId, "claw", action);
            const depth = p(shadowclawId, "depth", action);
            const gouge = Math.max(40, Math.round(p(shadowclawId, "gouge", action)));
            const base = p(shadowclawId, "rend", action);
            const ambush = p(shadowclawId, "ambush", action);
            const shred = Math.max(6, Math.round(p(shadowclawId, "shred", action)));
            const victim = action.target() !== null && world.valid(action.target()!) ? action.target() : null;
            const facts = victim === null ? null : world.observe(victim);
            const aimed = facts === null ? origin.plus(direction.scale(reach)) : facts.position();
            const anchor = aimed.plus(direction.scale(shade));
            const scale = Math.max(0.6, Math.min(2.0, half / shadowclawReference));
            let landed = false, unseen = false, power = base;

            // 影先到：暗带从脚下铺过目标，一直铺到它身后留出出爪的位置。depth 决定竖直覆盖，供表现读出爪的高矮。
            WorldFeedback.emit(world, shadowclawScene, 1, origin,
                { moment: "shade", path: shadowclawBand(origin, direction, aimed, shade, half), shade: shade, depth: depth,
                    scale: scale, direction: [direction.x(), direction.y(), direction.z()] }, 20);

            if (victim !== null && facts !== null) {
                // 对手没在攻击施法者，就是从它没看着的方向出手。
                const attacking = facts.attacking();
                unseen = attacking === null || String(attacking.ref()) !== String(actor.ref());
                power = unseen ? base * (1 + ambush) : base;
                landed = hurt(action, victim, shadowclawId, power,
                    { damage: damageSpec(shadowclawId, "rend"), contact: true });
                const at = facts.position();
                WorldFeedback.emit(world, shadowclawScene, 1, at,
                    { moment: "rend", target: String(victim.ref()), path: shadowclawStroke(anchor, at),
                        unseen: unseen ? 1 : 0, shred: shred, notes: shred,
                        scale: scale, intensity: Math.max(0.6, Math.min(2.4, power / 70)) }, 22);
                if (landed) {
                    // 影痕：命中处留一道暗色抓痕一段时间，让这一击落点可读。
                    WorldFeedback.keep(world, "shadowclaw:gouge:" + String(victim.ref()), shadowclawScene, 1, at,
                        { moment: "gouge", target: String(victim.ref()), depth: depth, scale: scale, gouge: gouge }, gouge);
                    if (unseen) WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.25, 0)), shadowclawAmbushText, [], 26);
                }
                sound(action, unseen ? "cobblemon:impact.dark" : "cobblemon:impact.ghost");
            }

            if (!landed) {
                WorldFeedback.emit(world, shadowclawScene, 1, anchor, { moment: "miss", path: shadowclawStroke(anchor, aimed), scale: scale }, 18);
                WorldFeedback.text(world, aimed.plus(WorldCombat.point(0, 0.9, 0)), shadowclawMissText, [], 20);
                sound(action, "minecraft:entity.player.attack.weak");
            }
            done(action);
        }
    });

    // 要害：共享结算判定为暴击后，在命中点补一记更亮的标记与浮字（暴击率来自原生 critRatio 2）。
    WorldCombat.on("world_combat:move_shadowclaw/vital", "world_combat:damage_applied", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.move) !== shadowclawId || data.critical !== true || !(data.actual > 0)) return;
        const target = event.target(), world = event.world();
        if (target === null || typeof data.x !== "number") return;
        const at = WorldCombat.point(data.x, data.y, data.z), ratio = (data.actual || 0) / 12;
        WorldFeedback.emit(world, shadowclawScene, 1, at,
            { moment: "crit", target: String(target.ref()), marks: Math.max(1, Math.min(4, Math.round(ratio))),
                scale: Math.max(0.7, Math.min(2.2, ratio)) }, 24);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.2, 0)), shadowclawVitalText, [], 30);
        world.sound("minecraft:entity.player.attack.crit", at, 14, "{}");
    });
}
