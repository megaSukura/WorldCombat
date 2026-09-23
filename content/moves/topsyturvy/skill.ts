/** topsyturvy：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    /** 把一次翻转的结果落到目标身上：取反、挂印记、播放「翻」的一幕与浮字。 */
    export function topsyApply(current: CombatAction, victim: CombatActor, shards: number, markTicks: number, shatter: number, onlyGains: boolean): void {
        const world = current.world();
        if (!world.valid(victim)) return;
        const flipped = topsyFlip(world, victim, onlyGains);
        MobEffects.apply(world, victim, topsyEffect, markTicks, Math.max(0, Math.min(6, flipped)));
        const body = world.observe(victim);
        const at = body === null ? current.targetPosition() : body.position();
        const scale = Math.max(0.5, Math.min(2, shatter / 0.9));
        WorldFeedback.emit(world, topsyScene, 1, at,
            { moment: "flip", target: String(victim.ref()), flipped: flipped,
                shards: Math.max(4, Math.round(shards * (flipped === 0 ? 0.4 : 1))), scale: scale }, 30);
        if (flipped > 0) WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), topsyFlipText, [flipped], 30);
        else WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), topsyEmptyText, [], 24);
        world.sound("minecraft:block.amethyst_block.resonate", at, 14, "{}");
    }

    define({
        id: topsyId,
        cooldownParameter: "recharge",
        name: "颠倒",
        description: "镜片命中后反转能力等级，还会将速度与缓慢、力量与虚弱等成对药水效果互换。择映式只把增益变成减益。",
        uses: ["对手靠增益吃满输出时，把它的增益变成等量的减益", "在对方刚加满攻速时一次抹掉它的优势", "干扰一个反复给自己上增益的厚目标"],
        kind: "enemy",
        range: 7,
        maxRange: 10,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 90,
        style: "mirror",
        turn: 15,
        defaults: { gain: false, ai: { maxChase: 10, minStages: 1 } },
        fields: [
            field(pathOf("gain"), "择映", "boolean", { help: "开启（择映）：只翻目标身上的正面变化，负面变化原样留着——绝不反过来帮对手；代价是起手 +4 刻、冷却 +20 刻、射程 −1 格。关闭（全翻）：正负全翻，更远更快更便宜，但对手若尽是减益，翻完等于给它加成。" })
        ],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[topsyId], detail: { values: config },
                world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(topsyId, "tempo", context)),
                recover: Math.round(p(topsyId, "aftercast", context)),
                cooldown: Math.round(p(topsyId, "recharge", context)),
                active: 1,
                range: p(topsyId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_topsyturvy:gather", topsyScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", gain: config && config.gain === true ? 1 : 0 }));
            return prepare;
        },
        indicator: function (config) {
            return { radius: p(topsyId, "reach"), geometry: "line", style: "mirror", color: 0xBFE3FF,
                label: config && config.gain === true ? "颠倒 · 择映" : "颠倒" };
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const speed = Math.max(0.6, p(topsyId, "shardSpeed", action));
            const radius = Math.max(0.2, p(topsyId, "shardRadius", action));
            const reach = Math.max(2, p(topsyId, "reach", action));
            const shards = Math.max(6, Math.round(p(topsyId, "shards", action)));
            const markTicks = Math.max(40, Math.round(p(topsyId, "markTicks", action)));
            const shatter = Math.max(0.4, p(topsyId, "shatter", action));
            const onlyGains = !!(config && config.gain);
            const targetRef = action.target() === null ? "" : String(action.target()!.ref());
            let settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "minecraft:entity.illusioner.prepare_mirror");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: reach, radius: radius,
                lifetime: Math.max(30, Math.round(reach / Math.max(0.2, speed) + 20)),
                appearance: { sprite: "cobblemon:generic/sparkle/bigsparkle", scale: 0.9, tint: 0xBFE3FF, glow: true },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    const scope = current.world(), struck = hit.target();
                    if (struck !== null && scope.valid(struck)) {
                        if (scope.friendly(struck)) {
                            WorldFeedback.emit(scope, topsyScene, 1, hit.position(),
                                { moment: "guard", shards: Math.max(4, Math.round(shards / 2)) }, 16);
                            return;
                        }
                        topsyApply(current, struck, shards, markTicks, shatter, onlyGains);
                        return;
                    }
                    WorldFeedback.emit(scope, topsyScene, 1, hit.position(),
                        { moment: "shatter", shards: Math.max(6, Math.round(shards / 2)),
                            scale: Math.max(0.5, shatter / 0.9) }, 18);
                    scope.sound("minecraft:block.amethyst_cluster.break", hit.position(), 12, "{}");
                }
            }, function (current: CombatAction) { finish(current); });
            WorldFeedback.emit(world, topsyScene, 1, action.origin(),
                { moment: "shot", projectile: flight, target: targetRef, shards: shards,
                    intensity: Math.max(0.7, Math.min(2, shards / 14)) }, 40);
        }
    });
}
