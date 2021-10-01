#!/bin/bash

NETWORK=$1

if [ "$STAGING" ]
then
  FILE=$NETWORK'-staging.json'
else
  FILE=$NETWORK'.json'
fi

DATA=manifest/data/$FILE

echo 'Generating manifest from data file: '$DATA
cat $DATA

mustache \
  -p manifest/templates/sources/LegacyOrganizationTemplates.yaml \
  -p manifest/templates/sources/OrganizationFactories.yaml \
  -p manifest/templates/sources/Organizations.yaml \
  -p manifest/templates/sources/OrganizationTemplates.yaml \
  -p manifest/templates/sources/TokenFactories.yaml \
  -p manifest/templates/sources/Tokens.yaml \
  -p manifest/templates/contracts/DAOKit.template.yaml \
  -p manifest/templates/contracts/DAOTemplate.template.yaml \
  -p manifest/templates/contracts/DAOFactory.template.yaml \
  -p manifest/templates/contracts/Kernel.template.yaml \
  -p manifest/templates/contracts/MiniMeToken.template.yaml \
  -p manifest/templates/contracts/MiniMeTokenFactory.template.yaml \
  $DATA \
  subgraph.template.yaml > subgraph.yaml
