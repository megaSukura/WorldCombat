/**
 * 超音波 / supersonic — 执行组织。
 *
 * 核心念头：把一圈声浪从体内推出去，扫过脚下一整片圆面；被波前扫到的敌人当场发懵。
 * 它不指向某个目标，也绕得过墙——对手的余地是跑出波前，而不是躲开一条射线。
 *
 * 出手：短起手（windup 播蓄声预告）后提交。
 * 命中：提交后声浪以 origin 为心、按 waveSpeed 每刻扩一圈；扫到的非友方挂共享身份
 *       world_combat:status/confusion 的 world_combat:supersonic_ring。已有混乱只被刷新。
 * 持续：混乱存续期由该 MobEffect 承担，周期性 keep 播放头顶飞鸟。
 * 随机分支：目标每次试图出手（world_combat:before_commit）按载体振幅掷骰；中则本次出手作废。
 * 反噬：目标每次打中非友方（world_combat:damage_applied）按自身攻击结算自伤。
 * 反制：声浪要时间扩散，离得远或在它推到之前跑开就不被扫到；波前之外是安全的。
 */
namespace PokemonSkills {
    function supersonicAbove(point: CombatPoint): CombatPoint { return point.plus(WorldCombat.point(0, 1, 0)); }

    function supersonicCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === supersonicEffect ? effect : null;
    }

    define({
        id: supersonicId,
        cooldownParameter: "recharge",
        name: "超音波",
        description: "从身体发出特殊的音波，从而使对手混乱。",
        uses: ["被围时一口气扰乱一圈敌人", "逼退贴身的多个目标", "在混战中制造集体失手窗口"],
        kind: "self",
        range: 14,
        maxRange: 14,
        prepare: 10,
        active: 1,
        recover: 8,
        cooldown: 90,
        style: "sonar",
        defaults: { band: "wide" },
        fields: [
            choice("band", "声浪形态", ["wide", "deep"], ["广域", "集中"])
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[supersonicId], detail: { values: config }, world, actor, attributes };
            const deep = config.band === "deep";
            return {
                prepare: Math.round(p(supersonicId, "tempo", context)),
                recover: Math.round(p(supersonicId, "aftercast", context)),
                cooldown: Math.round(p(supersonicId, "recharge", context) * (deep ? 1.1 : 1)),
                range: Math.max(4, Math.min(14, p(supersonicId, "waveReach", context) * (deep ? 0.7 : 1.3))),
                active: 1
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_supersonic:windup", supersonicScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", deep: config.band === "deep" ? 1 : 0 }));
            return prepare;
        },
        indicator: function () { return { radius: 6, geometry: "circle", style: "sonar", color: 0x6AD8FF, label: "超音波" }; },
        execute: function (action, move, config, done) {
            const world = action.world(), origin = action.origin();
            const deep = config.band === "deep";
            const reach = Math.max(2, Math.round(action.range()));
            const speed = p(supersonicId, "waveSpeed", action);
            const ticks = Math.max(20, Math.round(p(supersonicId, "mistTicks", action) * (deep ? 1.3 : 0.8)));
            const chance = Math.max(0.05, Math.min(0.9, supersonicBaseChance + (deep ? 0.1 : 0)));
            const motes = Math.max(4, Math.round(p(supersonicId, "waveMotes", action)));
            const reference = supersonicRingReference;
            const swept: string[] = [];
            let settled = false;
            sound(action, "minecraft:entity.warden.sonic_boom");
            WorldFeedback.text(world, supersonicAbove(origin), "world_combat.move.supersonic.text.call", [], 20);
            function sweep(current: CombatAction, radius: number, steps: number): void {
                if (settled) return;
                const scope = current.world();
                const actors = scope.query(origin, Math.min(14, Math.max(0.5, radius)), false);
                for (let i = 0; i < actors.length; i++) {
                    const other = actors[i], key = String(other.ref());
                    if (swept.indexOf(key) >= 0 || String(other.key()) === String(action.actor().key())) continue;
                    const body = scope.observe(other);
                    if (body === null || scope.friendly(other)) continue;
                    if (body.position().minus(origin).length() > radius) continue;
                    swept.push(key);
                    CombatStatus.apply(scope, other, "confusion", supersonicEffect, ticks, Math.round(chance * 100), { unique: true });
                    const at = body.position();
                    WorldFeedback.emit(scope, supersonicScene, 1, at,
                        { moment: "mark", target: key, scale: Math.max(0.5, Math.min(2, ticks / 180)) }, 30);
                    WorldFeedback.text(scope, supersonicAbove(at), "world_combat.move.supersonic.text.dazed", [], 26);
                }
                WorldFeedback.keep(scope, "supersonic-wave", supersonicScene, 1, origin,
                    { moment: "wave", radius: radius, scale: Math.max(0.05, radius / reference), motes: motes }, 6);
                if (radius >= reach || steps > 300) { settled = true; done(current); return; }
                current.after(1, function (next) { sweep(next, radius + speed, steps + 1); });
            }
            sweep(action, Math.max(0.2, speed), 0);
        }
    });


    // 反噬：被震懵的目标打中非友方时，按自身攻击结算一道自伤。
    WorldCombat.on("world_combat:move_supersonic/recoil", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), victim = event.target();
        if (victim === null || String(actor.key()) === String(victim.key()) || world.friendly(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (supersonicCarrier(world, actor) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const facts = PokemonDamage.combatants.read(world, actor);
        const attack = facts.stats.atk || 0;
        const fraction = supersonicRecoilFraction * Math.max(0.4, Math.min(2.5, attack / 100));
        const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
        if (loss <= 0) return;
        const power = Math.max(0.2, Math.min(3, loss / Math.max(1, body.maxHealth()) * 12));
        WorldFeedback.emit(world, supersonicScene, 1, body.position(), { moment: "fumble", target: String(actor.ref()), power: power }, 22);
        WorldFeedback.text(world, supersonicAbove(body.position()), "world_combat.move.supersonic.text.recoil", [Math.round(loss * 10) / 10], 30);
        world.sound("minecraft:entity.player.hurt", body.position(), 14, "{}");
    });

    // 混乱存续期：低密度飞鸟每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_supersonic/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== supersonicEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "supersonic:" + String(actor.ref()), supersonicScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 40);
    });
}
