/**
 * 祸不单行 / hex 的出手方式。
 *
 * 核心念头：诅咒贴着地面爬到对手脚下，画出一圈结界，再从圈里一波接一波向上涌出鬼影尖刺；
 *   谁站在圈里谁挨刺，而**谁身上带着异常，谁那一下翻倍**——异常落在一个目标身上，诅咒就认得它。
 *
 * 两幕：
 *   起（coil，提交前）：施法者掐指凝咒，脚边符文微亮，只播预告。
 *   咒（crawl → sigil → burst × waves / miss）：提交后诅咒沿地面爬到目标脚下（爬行速度决定首波时刻，
 *       画面是一条爬行咒线），画出半径 `sigil` 的结界；随后 `waves` 波涌刺，每波重新判定结界内的敌人，
 *       按每个目标各自的异常结算 curse（带异常者翻倍），并竖起 `spike` 高的尖刺。目标中途离场则诅咒落空。
 *
 * 与同族分开：群魔乱舞是飞出去追踪的鬼火、也吃异常，但它是「追着一队人打」；祸不单行是**留在原地的一片
 *   结界**，一波波向上涌刺，打的是站在圈里的人，离开圈就能躲开。唤醒巴掌只吃睡眠、命中即唤醒；
 *   欺诈读的是目标的物攻。这一招不挑异常种类。
 */
namespace PokemonSkills {
    define({
        id: hexId,
        name: "Hex",
        description: "This relentless attack does massive damage to a target affected by status conditions.",
        uses: ["在对手脚下布一片诅咒结界", "对带异常者补刀", "一次钉住挤在圈里的一群人"],
        kind: "enemy",
        range: 7.5,
        maxRange: 13.6,
        prepare: 5,
        active: 0,
        recover: 7,
        cooldown: 26,
        style: "ghost",
        defaults: { chain: false, ai: { maxChase: 11, blighted: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(hexId, "sigil", pokemon) : 1.5, geometry: "area", style: "ghost", color: 0x8A6BE0, label: "祸不单行" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[hexId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(hexId, "coil", context)),
                recover: Math.round(p(hexId, "settle", context)),
                cooldown: Math.round(p(hexId, "recharge", context)),
                active: 0,
                range: p(hexId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("hex:coil", hexScene, 1, action.origin(),
                JSON.stringify({ moment: "coil", chain: config && config.chain === true ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const origin = action.origin();
            const target = action.target();
            if (target === null) { done(action); return; }
            const actorRef = String(action.actor().ref());
            const targetRef = String(target.ref());
            const fallbackPoint = action.targetPosition();
            const distance = fallbackPoint.minus(origin).length();
            const crawl = Math.max(0.4, p(hexId, "crawl", action));
            const delay = Math.max(2, Math.round(distance / crawl));
            const radius = p(hexId, "sigil", action);
            const power = p(hexId, "curse", action);
            // 带上 curse 段的 resolve：命中时用**这个目标自己**的事实重算咒力，翻倍按人落地。
            const perTargetCurse = damageFeatures(hexId, "curse");
            const waves = Math.max(2, Math.round(p(hexId, "waves", action)));
            const interval = Math.max(2, Math.round(p(hexId, "interval", action)));
            const spike = p(hexId, "spike", action);
            const chain = config && config.chain === true;
            const scale = Math.max(0.6, Math.min(2.2, radius / 1.5));

            WorldFeedback.emit(world, hexScene, 1, origin,
                { moment: "crawl", path: [actorRef, targetRef], delay: delay, scale: scale, chain: chain ? 1 : 0 }, delay + 16);
            sound(action, "cobblemon:move.shadowball.actor");

            function arrival(current: CombatAction): void {
                const scope = current.world();
                const victim = scope.actor(targetRef);
                const body = victim !== null && scope.valid(victim) ? scope.observe(victim) : null;
                if (body === null) {
                    WorldFeedback.emit(scope, hexScene, 1, fallbackPoint, { moment: "miss", scale: scale }, 32);
                    WorldFeedback.text(scope, fallbackPoint.plus(WorldCombat.point(0, 1.0, 0)), hexMissText, [], 24);
                    done(current);
                    return;
                }
                const centre = body.position();
                const region = WorldGeometry.ring(centre, 0, radius, { below: 1.6, above: 2.9 });
                const spikes = Math.max(6, Math.round(radius * radius * 9));
                WorldFeedback.emit(scope, hexScene, 1, centre,
                    { moment: "sigil", radius: radius, scale: scale, waves: waves, spikes: spikes, chain: chain ? 1 : 0 }, 40);
                sound(current, "minecraft:entity.evoker.cast_spell");
                let wave = 0;

                function burst(now: CombatAction): void {
                    const field = now.world();
                    WorldFeedback.emit(field, hexScene, 1, centre,
                        { moment: "burst", radius: radius, scale: scale, spike: spike, spikes: spikes, wave: wave + 1, waves: waves }, 30);
                    WorldGeometry.selectEnemies(field, region, function (other, facts) {
                        if (String(other.ref()) === String(now.actor().ref())) return;
                        // 每一波都是一次完整结算；翻倍由 curse 段的 resolve 按这个目标自己的异常重算。
                        if (!hurt(now, other, hexId, power,
                            { damage: damageSpec(hexId, "curse"), knockback: false, resolve: perTargetCurse.resolve })) return;
                        const blighted = hexAfflictedNow(field, other);
                        WorldFeedback.emit(field, hexScene, 1, facts.position(),
                            { moment: "spike", target: String(other.ref()), scale: scale, spike: spike,
                                intensity: Math.max(0.6, Math.min(2.6, (blighted ? power * 2 : power) / 40)), blighted: blighted ? 1 : 0 }, 34);
                        WorldFeedback.text(field, facts.position().plus(WorldCombat.point(0, 1.0, 0)),
                            blighted ? hexBlightText : hexStrikeText, [], 20);
                    });
                    sound(now, "minecraft:entity.evoker_fangs.attack");
                    wave++;
                    if (wave >= waves) { done(now); return; }
                    now.after(interval, burst);
                }
                burst(current);
            }

            action.after(delay, arrival);
        }
    });
}
