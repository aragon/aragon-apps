#!/usr/bin/python

import yaml
import sys
from datetime import datetime 

base=sys.argv[1]
app=sys.argv[2]
network=sys.argv[3]
version=sys.argv[4]
cid=sys.argv[5]
contract=sys.argv[6]
commit=sys.argv[7]
txhash=sys.argv[8]
yamlpath=base + "environments/"+network+"/deploys.yml"

with open(yamlpath) as f:
  yaml.add_representer(datetime, lambda dumper, data: dumper.represent_scalar('tag:yaml.org,2002:timestamp', data.isoformat(timespec="milliseconds").replace("+00:00", "Z")))

  y=yaml.safe_load(f)
  y[app+'.aragonpm.eth']['versions'][version] = {
    'date': datetime.now(),
    'txHash': txhash,
    'ipfsHash': cid,
    'contractAddress': contract,
    'commitHash': commit,
  }

  with open(yamlpath, "w") as w:
      yaml.dump(y, w, default_flow_style=False, sort_keys=False)
