/**
 * 吸取力量 / strengthsap —— 出手方式。
 *
 * 核心念头：把根须搭上贴身的对手，直接从它的肌肉里吸走一股力气送进自己身体——对手越壮，这一口回得越足，
 *   同时被抽得物攻下降、留下虚弱的破绽。抽的是力气，不是生命；没有伤害。
 *
 * 两幕：
 *   起（windup，提交前）：脚边根须聚拢、绿光贴地亮起，预告这一次搭手（`action.present`）。
 *   吸（latch → drain → weaken）：提交后按真实距离与通视复查，够不到就收须；先按 `drain`（读目标此刻有效物攻
 *      相对自身的强弱）把生命抽回自身，再把目标的物攻按能力政策实际下降 `weak` 级：只有真的降下去才挂共享身份
 *      world_combat:status/strength_sapped 的虚弱，并显示真实变化。目标倒下或离场则只留散去的根须。
 *
 * 与同族分开：吸取／超级吸取／终极吸取抽的是**生命**，先要造成伤害；吸取力量抽的是**力气**，不看血量只
 *   看对手有多壮，一口回血的同时把对手的物攻按住——它也是本族唯一「回复 + 削弱」同体的一手。
 * 反制：抽取要贴身，拉开距离就够不到；对物攻本来就不高的对手，回的血也少。
 */
namespace PokemonSkills {
    const strengthsapScene = "world_combat:move_strengthsap";
    const strengthsapWeakened = "world_combat:strengthsap_weakened";
    const strengthsapLatchText = "world_combat.move.strengthsap.text.latch";
    const strengthsapSapText = "world_combat.move.strengthsap.text.sap";
    const strengthsapMissText = "world_combat.move.strengthsap.text.miss";
    const strengthsapRiseText = "world_combat.move.strengthsap.text.rise";
    const strengthsapNoText = "world_combat.move.strengthsap.text.none";

    define({
        id: "strengthsap",
        cooldownParameter: "recharge",
        name: "Strength Sap",
        description: "把根须搭上贴身的对手，吸走它的一股力气：按对手物攻相对自身的强弱回复生命，"
            + "并把对手的物攻下降一级。抽的是力气不是生命，没有伤害；对手越壮，回得越足、被削得越明显。",
        uses: ["在血量吃紧时从强敌身上一口回血", "顺手把对手的主力物攻按住", "给物攻型对手先剥一层力气"],
        kind: "enemy",
        range: 3.0,
        maxRange: 4.6,
        prepare: 8,
        active: 1,
        recover: 6,
        cooldown: 30,
        style: "sap",
        defaults: { deep: false, ai: { maxChase: 6, healBelow: 0.8, strongAt: 90 } },
        fields: [flag("deep", "深吸")],
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["strengthsap"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("strengthsap", "tempo", context)),
                recover: Math.round(p("strengthsap", "aftercast", context)),
                cooldown: Math.round(p("strengthsap", "recharge", context)),
                active: 1,
                range: p("strengthsap", "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_strengthsap:gather", strengthsapScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", intensity: config && config.deep === true ? 1.25 : 1 }));
            return prepare;
        },
        indicator: function (config, pokemon) {
            const context: NumberContext = { pokemon: pokemon!, skill: skills["strengthsap"], detail: { values: config } };
            return { radius: p("strengthsap", "reach", context), geometry: "circle", style: "sap", color: 0x8FC63F,
                label: config && config.deep === true ? "吸取力量·深吸" : "吸取力量" };
        },
        execute: function (action, move, config, done) {
            const world = action.world(), self = action.actor(), target = action.target();
            if (target === null || !world.valid(target) || world.friendly(target)) {
                WorldFeedback.emit(world, strengthsapScene, 1, action.targetPosition(), { moment: "fizzle" }, 18);
                WorldFeedback.text(world, action.targetPosition().plus(WorldCombat.point(0, 0.9, 0)), strengthsapMissText, [], 22);
                done(action);
                return;
            }
            const body = world.observe(target), me = world.observe(self);
            if (body === null || me === null) { done(action); return; }
            const at = body.position(), here = me.position(), span = here.minus(at).length();
            const reach = Math.max(1.5, p("strengthsap", "reach", action));
            // 复查真实距离与通视：按施法者中心到目标碰撞箱最近点判断（与招牌射程同一口径），
            // 对手走开或被墙挡住就收须，不结算。
            const edge = here.minus(world.closestPoint(target, here)).length();
            if (edge > reach || !world.clear(here, at)) {
                WorldFeedback.emit(world, strengthsapScene, 1, at, { moment: "fizzle" }, 18);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 0.9, 0)), strengthsapMissText, [], 22);
                done(action);
                return;
            }
            const fraction = Math.max(0.08, Math.min(0.5, p("strengthsap", "drain", action)));
            const weak = Math.max(1, Math.min(2, Math.round(p("strengthsap", "weak", action))));
            const ticks = Math.max(100, Math.round(p("strengthsap", "latch", action)));
            const motes = Math.max(10, Math.round(p("strengthsap", "motes", action)));
            const inward = span < 0.05 ? WorldCombat.point(0, 1, 0) : here.minus(at).unit();
            const scale = Math.max(0.6, Math.min(1.8, motes / 18));
            function link(moment: string, extra: any): any {
                const data: any = { moment: moment, path: ["target", "source"], target: String(target!.ref()),
                    direction: [inward.x(), inward.y(), inward.z()], span: span, motes: motes, scale: scale };
                Object.keys(extra || {}).forEach(function (key) { data[key] = extra[key]; });
                return data;
            }

            sound(action, "cobblemon:move.absorb.actor");
            // 先抽：按对手此刻的有效物攻求出的比例回血，读原生治疗许可后的真实回执。
            const healed = heal(world, self, fraction, "strengthsap");
            // 再削弱：读首次降级的真实前后差；能力阻止或反转时如实显示，不谎称削弱，也不挂破绽。
            const beforeAtk = NativeEffects.effectiveStage(world, target, "atk");
            const changed = NativeEffects.boost(world, target, "atk", -weak);
            const afterAtk = NativeEffects.effectiveStage(world, target, "atk");
            const sapped = Math.max(0, beforeAtk - afterAtk);
            const risen = Math.max(0, changed);
            if (sapped > 0) MobEffects.apply(world, target, strengthsapWeakened, ticks, 0);
            WorldFeedback.emit(world, strengthsapScene, 1, at, link("latch", { sapped: sapped }), 28);
            WorldFeedback.emit(world, strengthsapScene, 1, here,
                link("drain", { lit: healed > 0 ? Math.max(8, Math.round(motes * 0.8)) : 0 }), 26);
            if (sapped > 0) {
                WorldFeedback.emit(world, strengthsapScene, 1, at,
                    { moment: "weaken", target: String(target.ref()), weakMotes: Math.max(6, sapped * 6),
                      motes: Math.max(8, Math.round(motes * 0.6)), scale: scale }, 24);
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), strengthsapLatchText, [sapped], 28);
            } else if (risen > 0) {
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), strengthsapRiseText, [risen], 26);
            } else {
                WorldFeedback.text(world, at.plus(WorldCombat.point(0, 1.1, 0)), strengthsapNoText, [], 24);
            }
            if (healed > 0)
                WorldFeedback.text(world, here.plus(WorldCombat.point(0, 1.2, 0)), strengthsapSapText, [Math.round(healed * 10) / 10], 28);
            sound(action, "cobblemon:move.absorb.target");
            done(action);
        }
    });
}
