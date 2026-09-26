/** topsyturvy：行为、参数与目标条件以本单元实现为准。 */
namespace PokemonSkills {
    /**
     * 把一次翻转的结果落到目标身上：取反、挂印记、按真实符号播放「翻」的一幕与浮字。
     * 原生拒绝（没有任何可识别的等级／成对药水）时保留 shatter，不显示假的翻面状态。
     */
    export function topsyApply(current: CombatAction, victim: CombatActor, shards: number, markTicks: number, shatter: number, onlyGains: boolean): void {
        const world = current.world();
        if (!world.valid(victim)) return;
        const body = world.observe(victim);
        const at = body === null ? current.targetPosition() : body.position();
        const scale = Math.max(0.5, Math.min(2, shatter / 0.9));
        const signs = topsySigns(world, victim, onlyGains);
        const flipped = topsyFlip(world, victim, onlyGains);
        if (flipped > 0) {
            MobEffects.apply(world, victim, topsyEffect, markTicks, Math.max(0, Math.min(6, flipped)));
            WorldFeedback.emit(world, topsyScene, 1, at,
                { moment: "flip", target: String(victim.ref()), flipped: flipped, up: signs.up, down: signs.down,
                    shards: Math.max(4, Math.round(shards)), scale: scale }, 30);
            WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), topsyFlipText, [flipped], 30);
            world.sound("minecraft:block.amethyst_block.resonate", at, 14, "{}");
            return;
        }
        WorldFeedback.emit(world, topsyScene, 1, at,
            { moment: "shatter", target: String(victim.ref()), shards: Math.max(4, Math.round(shards * 0.5)), scale: scale }, 18);
        WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), topsyEmptyText, [], 24);
        world.sound("minecraft:block.amethyst_cluster.break", at, 12, "{}");
    }

    define({
        id: topsyId,
        cooldownParameter: "recharge",
        name: "颠倒",
        description: "甩出一枚镜片，命中任意活体后反转它的能力等级，还会把速度与缓慢、力量与虚弱等成对药水效果互换；选中友方时就是替它把身上的减益翻回增益。不认识的 Mod 效果原样保留，只有能配对的才翻。择映式只翻有益的部分。",
        uses: ["对手靠增益吃满输出时，把它的增益变成等量的减益", "在队友被叠满减益时一发把劣势翻回优势", "干扰一个反复给自己上增益的厚目标"],
        kind: "aim",
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
            const origin = action.origin();
            const direction = PokemonSkills.aim(action);
            let struckAnything = false, settled = false;
            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            sound(action, "minecraft:entity.illusioner.prepare_mirror");
            const flight = LivingActions.projectile(action, {
                speed: speed, range: reach, radius: radius,
                lifetime: Math.max(30, Math.round(reach / Math.max(0.2, speed) + 20)),
                appearance: { sprite: "cobblemon:generic/sparkle/bigsparkle", scale: 0.9, tint: 0xBFE3FF, glow: true },
                impact: function (current: CombatAction, hit: CombatImpact) {
                    struckAnything = true;
                    const scope = current.world(), struck = hit.target();
                    if (struck !== null && scope.valid(struck)) { topsyApply(current, struck, shards, markTicks, shatter, onlyGains); return; }
                    WorldFeedback.emit(scope, topsyScene, 1, hit.position(),
                        { moment: "shatter", shards: Math.max(6, Math.round(shards / 2)),
                            scale: Math.max(0.5, shatter / 0.9) }, 18);
                    scope.sound("minecraft:block.amethyst_cluster.break", hit.position(), 12, "{}");
                }
            }, function (current: CombatAction) {
                if (!struckAnything) {
                    WorldFeedback.emit(current.world(), topsyScene, 1, origin.plus(direction.scale(reach)),
                        { moment: "shatter", shards: Math.max(6, Math.round(shards / 2)),
                            scale: Math.max(0.5, shatter / 0.9) }, 18);
                    current.world().sound("minecraft:block.amethyst_cluster.break", origin.plus(direction.scale(reach)), 12, "{}");
                }
                finish(current);
            });
            WorldFeedback.emit(world, topsyScene, 1, action.origin(),
                { moment: "shot", projectile: flight, target: targetRef, shards: shards,
                    intensity: Math.max(0.7, Math.min(2, shards / 14)) }, 40);
        }
    });
}
