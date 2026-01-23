"""Main entry point for DeepThink"""

import argparse
import asyncio
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


def main():
    parser = argparse.ArgumentParser(description="DeepThink - Multi-Agent Reasoning Engine")
    
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    serve_parser = subparsers.add_parser("serve", help="Start the API server")
    serve_parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    serve_parser.add_argument("--port", type=int, default=8080, help="Port to bind to")
    serve_parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    
    run_parser = subparsers.add_parser("run", help="Run a single query")
    run_parser.add_argument("query", help="The query to process")
    run_parser.add_argument("--max-rounds", type=int, default=5, help="Maximum reasoning rounds")
    run_parser.add_argument("--model", default=None, help="Model to use")
    
    args = parser.parse_args()
    
    if args.command == "serve":
        import uvicorn
        uvicorn.run(
            "deepthink.api.server:app",
            host=args.host,
            port=args.port,
            reload=args.reload,
        )
    
    elif args.command == "run":
        from .graph import run_deep_think
        
        async def execute():
            result = await run_deep_think(
                query=args.query,
                max_rounds=args.max_rounds,
            )
            
            print("\n" + "=" * 60)
            print("FINAL OUTPUT")
            print("=" * 60)
            print(result.get("final_output", "No output"))
            print("\n" + "=" * 60)
            
            score = result.get("review_score", {})
            if score:
                print(f"Quality Score: {score.get('overall', 0):.2f}")
                print(f"  Completeness: {score.get('completeness', 0):.2f}")
                print(f"  Consistency: {score.get('consistency', 0):.2f}")
                print(f"  Confidence: {score.get('confidence', 0):.2f}")
            
            print(f"Rounds: {result.get('round', 0)}")
        
        asyncio.run(execute())
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
