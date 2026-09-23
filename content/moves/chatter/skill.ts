/**
 * 喋喋不休 / chatter 的出手方式。
 *
 * 核心念头：贴上去、张着嘴不停叫的一串尖叫。鸟朝身前一道扇面连叫几声，每一声都实打实疼一下；
 *   听的人脑子嗡掉——之后每次想出手都可能被打散，打中别人还会被自己的力气反噬。
 *   声波不看掩体，石头墙挡不住；代价是射程短、每一声都轻。
 *
 * 两幕：
 *   起（gather，提交前）：嗓子里聚起颤音，只播预告。
 *   叫（screech × bursts → scramble）：提交后按 `interval` 连叫，每一声沿瞄准方向张开一道扇面、
 *       扇面内每个非友方各结算一次 shriek（多段）；谁第一次被叫到就挂上本单元混乱载体
 *       （共享身份 world_combat:status/confusion）并浮出晕眩。全部叫完才收势。
 *
 * 混乱行为（本单元自己的变体，与家族写法一致）：目标每次想出手都可能被打散；打中非友方时按自身攻击反噬。
 * 与同族分开：奇异之光是一束直线幽光、必须看得见；爆裂拳是近身一抡顺带必乱；喋喋不休是中近距离、
 *   穿墙的连续几声，混乱是「烦出来」的，射程与单发威力都让给了段数。
 */
namespace PokemonSkills {
    /** 扇面地面的有序顶点：原点 + 从瞄准方向左右各半个张角间采样的弧点。判定与画面用同一组顶点。 */
    function chatterFan(origin: CombatPoint, direction: CombatPoint, reach: number, arcDegrees: number, samples: number): number[][] {
        const half = Math.min(180, Math.max(5, arcDegrees)) * Math.PI / 360;
        const base = Math.atan2(direction.x(), direction.z());
        const points: number[][] = [[origin.x(), origin.y() + 0.06, origin.z()]];
        for (let i = 0; i <= samples; i++) {
            const angle = base - half + 2 * half * i / samples;
            points.push([origin.x() + Math.sin(angle) * reach, origin.y() + 0.06, origin.z() + Math.cos(angle) * reach]);
        }
        return points;
    }

    /** 只有当代表载体就是本单元的 id 时，本单元的行为才接管。 */
    function chatterCarrier(world: CombatWorld, actor: CombatActor): CombatMobEffect | null {
        const effect = CombatStatus.representative(world, actor, "confusion");
        return effect !== null && String(effect.id()) === chatterEffect ? effect : null;
    }

    define({
        id: chatterId,
        cooldownParameter: "recharge",
        name: "Chatter",
        description: "对着身前一道扇面连叫几串尖锐的颤音：每一声都结算一次声音伤害，被叫到的人立刻陷入混乱——之后每次想出手都可能被打散，打中别人还会被自己的力气反噬。声波不被掩体阻挡，代价是射程短、每一声都轻。",
        uses: ["贴上去用一串尖叫连打几下", "隔着掩体把对手叫懵", "给危险的目标挂上失手与被反噬的窗口"],
        kind: "enemy",
        range: 8.5,
        maxRange: 13,
        prepare: 11,
        active: 0,
        recover: 8,
        cooldown: 36,
        style: "screech",
        defaults: { shrill: false, ai: { maxChase: 11, avoidConfused: true } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: pokemon ? p(chatterId, "reach", pokemon) : 8.5, geometry: "cone", style: "screech", color: 0x7E6CE8, label: "喋喋不休" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills[chatterId], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p(chatterId, "tempo", context)),
                recover: Math.round(p(chatterId, "aftercast", context)),
                cooldown: Math.round(p(chatterId, "recharge", context)),
                active: 0,
                range: p(chatterId, "reach", context)
            };
        },
        windup: function (action, config, prepare) {
            action.present("world_combat:move_chatter:gather", chatterScene, 1, action.origin(),
                JSON.stringify({ moment: "gather", windup: prepare, shrill: config && config.shrill ? 1 : 0 }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const world = action.world();
            const actor = action.actor();
            const body = world.observe(actor);
            const centre = body === null ? action.origin() : body.position();
            const power = p(chatterId, "shriek", action);
            const angle = p(chatterId, "coneAngle", action);
            const reach = Math.max(2.5, action.range());
            const interval = Math.max(3, Math.round(p(chatterId, "interval", action)));
            const bursts = Math.max(2, Math.round(p(chatterId, "bursts", action)));
            const scramble = Math.max(60, Math.round(p(chatterId, "scrambleTicks", action)));
            const fumble = Math.max(1, Math.min(100, Math.round(p(chatterId, "fumbleChance", action) * 100)));
            const screech = Math.max(5, Math.round(p(chatterId, "screech", action)));
            const scale = Math.max(0.6, Math.min(2.4, reach / 9));
            const intensity = Math.max(0.6, Math.min(2.2, power / 24));
            const caught: { [ref: string]: boolean } = {};
            let pulse = 0, hits = 0, settled = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; done(current); } }

            function fire(current: CombatAction): void {
                const scope = current.world();
                const here = scope.observe(actor);
                const origin = here === null ? centre : here.position();
                const direction = aim(current);
                const path = chatterFan(origin, direction, reach, angle, 10);
                WorldFeedback.emit(scope, chatterScene, 1, origin,
                    { moment: "screech", path: path, direction: [direction.x(), direction.y(), direction.z()],
                        angle: angle, reach: reach, screech: screech, scale: scale,
                        index: pulse + 1, bursts: bursts, intensity: intensity }, 20);
                WorldGeometry.selectEnemies(scope, WorldGeometry.sector(origin, direction, reach, angle, { below: 2, above: 3 }), function (victim, facts) {
                    if (String(victim.ref()) === String(actor.ref())) return;
                    if (!hurt(current, victim, chatterId, power, { damage: damageSpec(chatterId, "shriek"), sound: true })) return;
                    hits++;
                    const ref = String(victim.ref());
                    if (caught[ref]) return;
                    caught[ref] = true;
                    CombatStatus.apply(scope, victim, "confusion", chatterEffect, scramble, fumble, { unique: true });
                    WorldFeedback.emit(scope, chatterScene, 1, facts.position(),
                        { moment: "scramble", target: ref, screech: screech, scale: scale }, 36);
                    WorldFeedback.text(scope, facts.position().plus(WorldCombat.point(0, 1.3, 0)), chatterScrambleText, [Math.round(scramble / 20)], 34);
                    scope.sound("cobblemon:status.volatile.confusion.actor", facts.position(), 14, "{}");
                });
                scope.sound(pulse % 2 === 0 ? "minecraft:entity.parrot.ambient" : "minecraft:entity.bat.ambient", origin, 16, "{}");
                pulse++;
                if (pulse >= bursts) { finish(current); return; }
                current.after(interval, fire);
            }

            sound(action, "minecraft:entity.parrot.ambient");
            fire(action);
        }
    });


    // 反噬：被叫懵的目标打中非友方时，按自身攻击结算一道自伤。
    WorldCombat.on("world_combat:move_chatter/recoil", "world_combat:damage_applied", "", function (event) {
        const world = event.world(), actor = event.actor(), victim = event.target();
        if (victim === null || String(actor.key()) === String(victim.key()) || world.friendly(victim)) return;
        const data = JSON.parse(String(event.data()));
        if (!(data.actual > 0)) return;
        if (chatterCarrier(world, actor) === null) return;
        const body = world.observe(actor);
        if (body === null) return;
        const facts = PokemonDamage.combatants.read(world, actor);
        const attack = facts.stats.atk || 0;
        const fraction = chatterRecoilFraction * Math.max(0.4, Math.min(2.5, attack / 100));
        const loss = -world.health(actor, -body.maxHealth() * fraction, "world_combat:confusion");
        if (loss <= 0) return;
        const power = Math.max(0.2, Math.min(3, loss / Math.max(1, body.maxHealth()) * 12));
        WorldFeedback.emit(world, chatterScene, 1, body.position(), { moment: "fumble", target: String(actor.ref()), power: power }, 22);
        WorldFeedback.text(world, body.position().plus(WorldCombat.point(0, 1.3, 0)), chatterRecoilText, [Math.round(loss * 10) / 10], 30);
        world.sound("minecraft:entity.player.hurt", body.position(), 14, "{}");
    });

    // 混乱存续期：低密度的晕眩鸟每 20 刻续期，让出本体视线。
    WorldCombat.on("world_combat:move_chatter/linger", "world_combat:mob_effect_tick", "", function (event) {
        const data = JSON.parse(String(event.data()));
        if (String(data.id) !== chatterEffect) return;
        const world = event.world(), actor = event.actor();
        if (!world.valid(actor) || world.tick() % 20 !== 0) return;
        const body = world.observe(actor);
        if (body === null) return;
        WorldFeedback.keep(world, "chatter:" + String(actor.ref()), chatterScene, 1, body.position(),
            { moment: "linger", target: String(actor.ref()) }, 40);
    });
}
