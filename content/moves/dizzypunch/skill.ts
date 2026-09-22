/**
 * 迷昏拳 / dizzypunch 的出手方式。
 *
 * 核心念头：一串**有节奏的连拳**——双拳交替、节拍分明，一下接一下短促地点打，快的人打更多下。
 * 每一下都扫过身前的小扇面，挨打的人被节奏打得脑袋发懵；整串打完再按概率让被打中的人天旋地转，
 * 此后出手会打偏、还会被自己的力气带倒。它的身份是「节拍」，不是某一记重拳。
 *
 * 三幕：
 *   起（windup，提交前）：双拳交替摆动、脚下踏出节拍，只播预告。
 *   打（swing → hit，提交后）：按 `interval` 刻一拍，每拍朝瞄准方向扫一个小扇面（reach／arc），
 *       扇面里的非友方各吃一记 flurry 接触+拳伤害，共打 `beats` 拍。
 *   晕（daze）：整串结束时，被打中的人按 chance 陷入混乱（本单元的共享身份载体）；受击者头顶冒出星星。
 *
 * 混乱行为（本单元自己的变体）：目标每次想出手都可能被打散（失手概率存在载体振幅里），
 * 打中非友方时按自身攻击反噬——这是迷昏拳「被打懵会打到自己」区别于水之波动「只是耳鸣」的地方。
 * 配置 `rapid` 由 resolve 改时序、由公式改拳数与每拳威力，提交后才触碰世界。
 */
namespace PokemonSkills {
    const dizzypunchScene = "world_combat:move_dizzypunch";
    const dizzypunchDazeEffect = "world_combat:dizzypunch_daze";
    const dizzypunchDazeText = "world_combat.move.dizzypunch.text.daze";
    const dizzypunchMissText = "world_combat.move.dizzypunch.text.miss";
    const dizzypunchRecoilText = "world_combat.move.dizzypunch.text.recoil";
    /** 反噬基数（最大生命比例）；被这串拳打懵的目标打中别人时按攻击放大。 */
    const dizzypunchRecoilFraction = 0.06;

    /** 只有当代表载体就是本单元的 id 时，本单元的门禁才接管。 */
    function dizzypunchCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === dizzypunchDazeEffect ? effect : null;
    }

    function dizzypunchConfuse(world: CombatWorld, victim: CombatActor, at: CombatPoint, ticks: number, fumblePct: number): boolean {
        if (!CombatStatus.apply(world, victim, "confusion", dizzypunchDazeEffect, ticks, fumblePct, { unique: true })) return false;
        const body = world.observe(victim);
        const point = body !== null ? body.position() : at;
        WorldFeedback.emit(world, dizzypunchScene, 1, at, { moment: "daze", target: String(victim.ref()), fumble: fumblePct }, 26);
        WorldFeedback.text(world, point.plus(WorldCombat.point(0, 1.3, 0)), dizzypunchDazeText, [], 28);
        return true;
    }

    /** 小扇面的有序顶点：原点 + 从瞄准方向左右各半个张角间采样的弧点。判定与画面用同一组顶点。 */
    function dizzypunchFan(origin: CombatPoint, direction: CombatPoint, reach: number, arcDegrees: number, samples: number): number[][] {
        const half = Math.min(180, Math.max(5, arcDegrees)) * Math.PI / 360;
        const base = Math.atan2(direction.x(), direction.z());
        const points: number[][] = [[origin.x(), origin.y() + 0.05, origin.z()]];
        for (let index = 0; index <= samples; index++) {
            const angle = base - half + 2 * half * index / samples;
            points.push([origin.x() + Math.sin(angle) * reach, origin.y() + 0.05, origin.z() + Math.cos(angle) * reach]);
        }
        return points;
    }

    define({
        id: "dizzypunch",
        name: "Dizzy Punch",
        description: "The target is hit with rhythmically launched punches. This may also leave the target confused.",
        uses: ["贴身按节拍连打一串", "把小扇面里的几个敌人一起打懵", "用混乱制造失手窗口"],
        kind: "enemy",
        range: 2.5,
        maxRange: 2.9,
        prepare: 10,
        active: 24,
        recover: 9,
        cooldown: 30,
        style: "punch",
        defaults: { rapid: false, ai: { maxChase: 6, punishCrowd: true, finishLow: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("dizzypunch", "reach", pokemon) * 1.4, geometry: "cone", style: "punch",
                color: 0xE8B24F, label: config && config.rapid === true ? "疾风迷昏拳" : "迷昏拳" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["dizzypunch"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("dizzypunch", "tempo", context)),
                recover: Math.round(p("dizzypunch", "aftercast", context)),
                cooldown: Math.round(p("dizzypunch", "recharge", context)),
                active: skills["dizzypunch"].active,
                range: p("dizzypunch", "reach", context) + 0.3
            };
        },
        windup: function (action, config, prepare) {
            action.present("dizzypunch:shuffle", dizzypunchScene, 1, action.origin(),
                JSON.stringify({ moment: "shuffle", beats: p("dizzypunch", "beats", action), rapid: config && config.rapid === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const beats = Math.max(1, Math.round(p("dizzypunch", "beats", action)));
            const interval = Math.max(2, Math.round(p("dizzypunch", "interval", action)));
            const reach = p("dizzypunch", "reach", action);
            const arc = p("dizzypunch", "arc", action);
            const perBeat = p("dizzypunch", "flurry", action);
            const daze = Math.max(40, Math.round(p("dizzypunch", "dazeTicks", action)));
            const chance = Math.max(0.02, Math.min(0.9, p("dizzypunch", "chance", action)));
            const fumblePct = Math.round(Math.max(0.05, Math.min(0.9, p("dizzypunch", "fumble", action))) * 100);
            const stars = Math.max(4, Math.round(p("dizzypunch", "stars", action)));
            const scale = Math.max(0.6, Math.min(2.0, reach / 2.2));
            const intensity = Math.max(0.6, Math.min(2.4, perBeat / 24));
            const victims: string[] = [];
            let beat = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function dazePass(current: CombatAction): void {
                const scope = current.world();
                if (victims.length === 0) {
                    WorldFeedback.emit(scope, dizzypunchScene, 1, current.origin(), { moment: "whiff", scale: scale }, 20);
                    WorldFeedback.text(scope, current.origin().plus(WorldCombat.point(0, 1.2, 0)), dizzypunchMissText, [], 20);
                    finish(current);
                    return;
                }
                for (let index = 0; index < victims.length; index++) {
                    const victim = scope.actor(victims[index]);
                    if (victim === null || !scope.valid(victim)) continue;
                    const body = scope.observe(victim);
                    const at = body !== null ? body.position() : current.origin();
                    if (scope.random() < chance) dizzypunchConfuse(scope, victim, at, daze, fumblePct);
                }
                finish(current);
            }

            function punch(current: CombatAction): void {
                const scope = current.world();
                const body = scope.observe(current.actor());
                if (body === null) { finish(current); return; }
                const origin = body.position();
                const direction = aim(current);
                beat++;
                const from = beat % 2 === 0 ? 1 : -1;
                const path = dizzypunchFan(origin, direction, reach, arc, 8);
                WorldFeedback.emit(scope, dizzypunchScene, 1, origin,
                    { moment: "swing", beat: beat, beats: beats, arc: arc, reach: reach, side: from, path: path,
                        flows: Math.max(18, Math.round(20 + arc * 0.6)),
                        direction: [direction.x(), direction.y(), direction.z()], scale: scale, intensity: intensity }, 14);
                let landed = false;
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, direction, reach, arc, { below: 1.2, above: 2.4 }),
                    function (victim, facts) {
                        const ref = String(victim.ref());
                        if (victims.indexOf(ref) < 0) victims.push(ref);
                        if (hurt(current, victim, "dizzypunch", perBeat,
                            { damage: damageSpec("dizzypunch", "flurry"), contact: true, punch: true })) landed = true;
                        WorldFeedback.emit(scope, dizzypunchScene, 1, facts.position(),
                            { moment: "hit", target: ref, beat: beat, beats: beats, stars: stars,
                                side: from, scale: scale, intensity: intensity }, 16);
                    });
                if (landed) sound(current, "cobblemon:impact.fighting");
                if (beat >= beats) { dazePass(current); return; }
                current.after(interval, punch);
            }

            sound(action, "cobblemon:move.confusion.actor");
            WorldFeedback.emit(world, dizzypunchScene, 1, action.origin(),
                { moment: "punch", beats: beats, arc: arc, reach: reach, scale: scale, intensity: intensity }, 18);
            punch(action);
        }
    });


    // 反噬：被迷昏的目标打中非友方时，按自身攻击结算一道自伤。
    WorldCombat.on("world_combat:move_dizzypunch/recoil", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), victim = event.target();
        if (victim === null || String(actor.key()) === String(victim.key()) || world.friendly(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (dizzypunchCarrier(world, actor) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const facts = PokemonDamage.combatants.read(world, actor);
        const attack = facts.stats.atk || 0;
        const fraction = dizzypunchRecoilFraction * Math.max(0.4, Math.min(2.5, attack / 100));
        const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
        if (loss <= 0) return;
        WorldFeedback.emit(world, dizzypunchScene, 1, body.position(), { moment: "fumble", target: String(actor.ref()) }, 20);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), dizzypunchRecoilText, [Math.round(loss * 10) / 10], 28);
        world.sound("minecraft:entity.player.hurt", body.position(), 14, "{}");
    });

    // 眩晕存续期：低密度的星星与飞鸟每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_dizzypunch/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== dizzypunchDazeEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "dizzypunch:daze:" + String(actor.ref()), dizzypunchScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 40);
    });
}
