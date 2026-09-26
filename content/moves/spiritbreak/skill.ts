/** A short approach carries a narrow active palm, able to intercept one supported hostile projectile. */
namespace PokemonSkills {
    const spiritbreakScene = "world_combat:move_spiritbreak";
    const spiritbreakText = "world_combat.move.spiritbreak.text.smash";

    define({
        freeMovement: true,
        id: "spiritbreak",
        cooldownParameter: "wait",
        name: "Spirit Break",
        description: "短步切入并推出一掌，掌前短窗可击散一枚原生允许拦截的敌弹；掌击实际首碰敌人时结算原主伤、削特攻和受力推开。特殊不支持的弹照常继续，空掌也可迎弹。",
        uses: ["贴身压制一个法系输出", "把对手从阵型里撞开、打散它的特攻", "在狭窄空间里用冲撞抢身位"],
        kind: "aim",
        range: 4.4,
        maxRange: 6.5,
        prepare: 12,
        active: 0,
        recover: 10,
        cooldown: 40,
        style: "spiritbreak",
        defaults: { shatter: false, ai: { maxChase: 10 } },
        fields: [],
        indicator: function (config, pokemon) {
            return { radius: p("spiritbreak", "momentum", pokemon) / 2 + 1, geometry: "line", style: "spiritbreak",
                color: 0xF58CB8, label: config && config.shatter === true ? "碎魂式灵魂冲击" : "灵魂冲击" };
        },
        resolve: function (pokemon, config, world, actor, attributes) {
            const context: NumberContext = { pokemon, skill: skills["spiritbreak"], detail: { values: config }, world: world || null, actor: actor || null, attributes };
            return {
                prepare: Math.round(p("spiritbreak", "tempo", context)),
                recover: Math.round(p("spiritbreak", "aftercast", context)),
                cooldown: Math.round(p("spiritbreak", "wait", context)),
                active: 0,
                range: Math.min(skills["spiritbreak"].maxRange!, p("spiritbreak", "momentum", context) / 2 + 1.0)
            };
        },
        windup: function (action, config, prepare) {
            action.present("spiritbreak:gather", spiritbreakScene, 1, action.origin(),
                JSON.stringify({ moment: "windup", shatter: config && config.shatter === true }));
            return prepare;
        },
        execute: function (action, move, config, done) {
            const movementScenes = WorldFeedback.actionScenes(spiritbreakScene);
            const world = action.world();
            const actor = action.actor();
            const power = p("spiritbreak", "spirit", action);
            const momentum = Math.max(.5, p("spiritbreak", "momentum", action) / 2);
            const pace = Math.max(0.7, p("spiritbreak", "pace", action));
            const radius = Math.max(0.4, p("spiritbreak", "cloak", action));
            const push = Math.max(0.2, p("spiritbreak", "push", action));
            const stages = Math.max(1, Math.min(2, Math.round(p("spiritbreak", "drop", action))));
            const sparks = Math.max(12, Math.round(p("spiritbreak", "sparks", action)));
            const halo = Math.max(6, Math.min(16, Math.round(p("spiritbreak", "halo", action) / 4)));
            const direction = aim(action);
            const scale = Math.max(0.6, Math.min(1.8, radius / 0.55));
            const intensity = Math.max(0.6, Math.min(2.4, power / 75));
            let travelled = 0, settled = false, intercepted = false;

            function finish(current: CombatAction): void { if (!settled) { settled = true; movementScenes.finish(current, done); } }

            function smash(current: CombatAction, hit: CombatImpact): void {
                const scope = current.world(), victim = hit.target(), point = hit.position();
                if (victim === null || !scope.valid(victim) || scope.friendly(victim)) { finish(current); return; }
                const landed = impact(current, hit, "spiritbreak", power,
                    { damage: damageSpec("spiritbreak", "spirit"), contact: true });
                WorldFeedback.emit(scope, spiritbreakScene, 1, point,
                    { moment: "smash", target: String(victim.ref()), drop: stages, sparks: sparks, scale: scale, intensity: intensity }, 26);
                sound(current, "cobblemon:impact.fairy");
                if (landed && scope.valid(victim)) {
                    NativeEffects.boost(scope, victim, "spa", -stages);
                    scope.hitDisplace(victim, direction.scale(push));
                    WorldFeedback.text(scope, point.plus(WorldCombat.point(0, 1.2, 0)), spiritbreakText, [stages], 30);
                }
                finish(current);
            }

            function interceptPalm(current:CombatAction):void {
                if(intercepted)return;
                const scope=current.world(),at=current.origin(),front=at.plus(direction.scale(1)),region=WorldGeometry.bodySegment(at,front,.4);
                const shots:CombatProjectileFacts[]=JSON.parse(scope.projectiles(at,2));
                for(let i=0;i<shots.length;i++){
                    const shot=shots[i];if(!shot.hostile||!shot.interceptable)continue;
                    const min=WorldCombat.point(shot.boundsMin[0],shot.boundsMin[1],shot.boundsMin[2]),max=WorldCombat.point(shot.boundsMax[0],shot.boundsMax[1],shot.boundsMax[2]);
                    const point=WorldCombat.point(shot.position[0],shot.position[1],shot.position[2]);
                    if(!region.intersects(min,max)||!scope.clear(at,point))continue;
                    if(scope.interceptProjectile(shot.id)){
                        intercepted=true;WorldFeedback.emit(scope,spiritbreakScene,1,point,{moment:"intercept",sparks:sparks,scale:scale},halo);break;
                    }
                }
            }
            function palm(current:CombatAction):void {
                interceptPalm(current);const from=current.origin(),hit=current.trace(from,from.plus(direction.scale(1)),Math.min(.4,radius));
                const end=hit.position();movementScenes.show(current,"palm",from,{moment:"palm",path:[[from.x(),from.y(),from.z()],[end.x(),end.y(),end.z()]]});
                if(hit.hitEntity())smash(current,hit);else current.after(2,finish);
            }
            function advance(current: CombatAction): void {
                interceptPalm(current);
                const scope = current.world(), here = current.origin();
                const step = Math.min(pace, Math.max(0, momentum - travelled));
                if (step <= .001) { palm(current); return; }
                const swept = sweepStep(current, direction.scale(step), radius),hit=swept.hit;
                interceptPalm(current);
                if(hit.hitEntity()){smash(current,hit);return;}
                travelled+=swept.moved;
                const end=current.origin().plus(direction.scale(1));
                movementScenes.show(current,"palm",current.origin(),{moment:"palm",path:[[current.origin().x(),current.origin().y(),current.origin().z()],[end.x(),end.y(),end.z()]]});
                if(hit.blocked()||swept.moved<.05||travelled>=momentum){palm(current);return;}
                current.after(1,advance);
            }

            sound(action, "minecraft:entity.iron_golem.attack");
            movementScenes.show(action, "rush", action.origin(), { moment: "rush", sparks: sparks, scale: scale, intensity: intensity });
            advance(action);
        }
    });
}
