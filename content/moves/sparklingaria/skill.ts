/**
 * 泡影的咏叹调 / sparklingaria 的出手方式。
 *
 * 核心念头：唱起一支歌，一圈亮晶晶的气泡从身周荡开。站在这圈里、且与歌声之间没有墙挡着的敌人被水压轰中，
 * 越靠中心越重；同一圈里所有**别人**身上的灼伤被气泡洗净，洗净成功才按真实回血亮一下——唱歌的人自己
 * 不算在内。它必须站进人群里才能同时打到人和洗到人，这是它与别的歌（爆音波、轮唱）最大的不同。
 *
 * 三幕：
 *   起（windup，提交前）：吸气、气泡在身前收成一簇，可免费打断。
 *   爆（burst → hit / wash / heal）：气泡浪整圈炸开；圈内每个非友方按到中心的距离衰减后各挨一记 `burst`；
 *       被气泡碰到的人身上的灼伤由共享状态入口洗净（`CombatStatus.cure`），洗净成功再尝试回血
 *       （`heal` 返回真实回复量）。墙、山体等真实遮挡挡住的个体不会因为同在一个圆里就被洗或被打。
 *   余（note）：几个气泡音符在身周慢慢上浮，只作画面，不再结算。
 *
 * 对宝可梦、原版生物、其他模组生物和玩家，伤害（hurt → PokemonDamage）、状态（CombatStatus.cure）
 * 与回血（PokemonSkills.heal）都走同一条路。
 */
namespace PokemonSkills {
    const sparklingariaScene = "world_combat:move_sparklingaria";
    const sparklingariaHitText = "world_combat.move.sparklingaria.text.hit";
    const sparklingariaCureText = "world_combat.move.sparklingaria.text.cure";
    const sparklingariaWashText = "world_combat.move.sparklingaria.text.wash";
    const sparklingariaMissText = "world_combat.move.sparklingaria.text.miss";

    define({
        id: "sparklingaria",
        name: "Sparkling Aria",
        description: "唱起一支歌，一圈亮晶晶的气泡从身周荡开：圈内、且与歌声之间没有遮挡的敌人被水压轰中，越靠中心越重；圈内所有别人身上的灼伤被气泡洗净，洗净成功才按真实回复亮一下（唱歌的人自己不算）。",
        uses: ["站在人堆里一次轰到几个敌人", "替身边的同伴洗掉灼伤", "被围住时原地炸开一圈气泡"],
        kind: "self",
        range: 4.5,
        maxRange: 7.5,
        prepare: 14,
        active: 0,
        recover: 10,
        cooldown: 38,
        style: "water",
        defaults: { highNote: false, ai: { maxChase: 9, cureAllies: true } },
        fields: [field(pathOf("highNote"), "高音", "boolean", {
            help: "开启：范围约 ×1.25、气泡更多，但单点威力约 ×0.85，起手 +2 刻、冷却 +8 刻，用来一次洗更大一片。关闭（收束咏叹调）：范围约 ×0.85、单点约 ×1.15，收手更快。"
        })],
        indicator: function (config, pokemon) {
            return { radius: p("sparklingaria", "radius", pokemon), geometry: "area", style: "water", color: 0x5FC6E8,
                label: config && config.highNote === true ? "高音咏叹调" : "收束咏叹调" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["sparklingaria"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            const high = !!(config && config.highNote);
            return {
                prepare: Math.max(4, Math.round(p("sparklingaria", "prepare", context)) + (high ? 2 : -2)),
                recover: Math.round(p("sparklingaria", "recover", context)),
                cooldown: Math.max(18, Math.round(p("sparklingaria", "cooldown", context)) + (high ? 8 : -6)),
                active: 0,
                range: p("sparklingaria", "radius", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("sparklingaria:inhale", sparklingariaScene, 1, action.origin(),
                JSON.stringify({ moment: "inhale", highNote: config && config.highNote === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world(), actor = action.actor();
            const body = world.observe(actor);
            const centre = body !== null ? body.position() : action.origin();
            const radius = Math.max(2.5, p("sparklingaria", "radius", action));
            const power = p("sparklingaria", "burst", action);
            const falloff = Math.max(0.35, Math.min(0.85, p("sparklingaria", "falloff", action)));
            const bubbles = Math.max(6, Math.round(p("sparklingaria", "bubbles", action)));
            const cureHeal = Math.max(0, Math.min(0.2, p("sparklingaria", "cureHeal", action)));
            const cap = Math.max(1, Math.round(p("sparklingaria", "maxTargets", action)));
            const scale = radius / 4.5;
            let struck = 0, cured = 0;

            WorldGeometry.select(world, WorldGeometry.ring(centre, 0, radius, { below: 3, above: 4 }), function (other, facts) {
                if (String(other.ref()) === String(actor.ref())) return;
                // 声与水的真实可达性：被墙/地形完全挡住的个体不因同在一个圆里直接被洗或被打。
                if (!world.clear(centre, facts.position())) return;
                if (CombatStatus.has(world, other, "burn") && CombatStatus.cure(world, other, "burn")) {
                    cured++;
                    // 洗净成功才尝试回血；实际回血量由 heal 返回，拒疗/满血只清不显示回血。
                    const restored = heal(world, other, cureHeal, "sparklingaria");
                    WorldFeedback.emit(world, sparklingariaScene, 1, facts.position(),
                        { moment: "wash", target: String(other.ref()), restored: restored > 0 ? 1 : 0,
                            intensity: Math.max(0.5, Math.min(1.6, cureHeal / 0.06)) }, 24);
                    if (restored > 0) WorldFeedback.emit(world, sparklingariaScene, 1, facts.position(),
                        { moment: "heal", target: String(other.ref()), heal: Math.round(restored * 10) / 10 }, 22);
                    WorldFeedback.text(world, facts.position().plus(WorldCombat.point(0, 1.1, 0)), sparklingariaWashText, [], 26);
                }
                if (facts.friendly() || struck >= cap) return;
                const distance = facts.position().minus(centre).length();
                const reach = radius <= 0 ? 0 : Math.min(1, distance / radius);
                const strength = 1 - (1 - falloff) * reach;
                if (!hurt(action, other, "sparklingaria", power * strength, { damage: damageSpec("sparklingaria", "burst"), sound: true })) return;
                struck++;
                WorldFeedback.emit(world, sparklingariaScene, 1, facts.position(),
                    { moment: "hit", target: String(other.ref()), scale: scale,
                        intensity: Math.max(0.5, Math.min(2, power * strength / 100)), count: Math.round(12 + power * strength * 0.22) }, 26);
            });

            WorldFeedback.emit(world, sparklingariaScene, 1, centre,
                { moment: "burst", radius: radius, scale: scale, bubbles: bubbles, flows: Math.round(60 + radius * 24),
                    intensity: Math.max(0.7, Math.min(2.2, power / 100)) }, 30);
            sound(action, "cobblemon:move.sing.actor");
            sound(action, "cobblemon:impact.water");
            WorldFeedback.keep(world, "sparklingaria:note:" + String(actor.ref()), sparklingariaScene, 1, centre,
                { moment: "note", radius: radius, bubbles: bubbles }, 40);
            WorldFeedback.text(world, centre.plus(WorldCombat.point(0, 1.4, 0)),
                cured > 0 ? sparklingariaCureText : struck > 0 ? sparklingariaHitText : sparklingariaMissText,
                cured > 0 ? [cured] : struck > 0 ? [struck] : [], 26);
            done(action);
        }
    });
}
